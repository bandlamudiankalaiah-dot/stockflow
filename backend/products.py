"""Product CRUD and stock management, always scoped to the caller's organization."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import Product, User, get_or_create_settings, utcnow
from schemas import (
    ProductCreate,
    ProductListOut,
    ProductOut,
    ProductUpdate,
    StockAdjustRequest,
)

router = APIRouter(prefix="/products", tags=["Products"])


def build_product_out(product: Product, default_threshold: int) -> ProductOut:
    """Serialise a product and derive its live low-stock state."""
    threshold = (
        product.low_stock_threshold
        if product.low_stock_threshold is not None
        else default_threshold
    )
    quantity = product.quantity_on_hand or 0
    is_low_stock = quantity <= threshold

    if quantity == 0:
        status_label = "Out of Stock"
    elif is_low_stock:
        status_label = "Low Stock"
    else:
        status_label = "In Stock"

    cost = float(product.cost_price) if product.cost_price is not None else 0.0
    selling = float(product.selling_price) if product.selling_price is not None else None

    return ProductOut(
        id=product.id,
        organization_id=product.organization_id,
        name=product.name,
        sku=product.sku,
        description=product.description,
        quantity_on_hand=quantity,
        cost_price=float(product.cost_price) if product.cost_price is not None else None,
        selling_price=selling,
        low_stock_threshold=product.low_stock_threshold,
        effective_threshold=threshold,
        is_low_stock=is_low_stock,
        status=status_label,
        inventory_value=round(quantity * cost, 2),
        created_at=product.created_at,
        updated_at=product.updated_at,
    )


def get_owned_product(db: Session, product_id: int, organization_id: int) -> Product:
    """Fetch a product belonging to the organization or raise 404."""
    product = (
        db.query(Product)
        .filter(Product.id == product_id, Product.organization_id == organization_id)
        .first()
    )
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
        )
    return product


def ensure_sku_available(
    db: Session,
    organization_id: int,
    sku: str,
    exclude_product_id: Optional[int] = None,
) -> None:
    query = db.query(Product).filter(
        Product.organization_id == organization_id,
        func.upper(Product.sku) == sku.upper(),
    )
    if exclude_product_id is not None:
        query = query.filter(Product.id != exclude_product_id)
    if query.first() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A product with SKU '{sku}' already exists in your organization",
        )


def current_default_threshold(db: Session, user: User) -> int:
    return get_or_create_settings(db, user.organization_id).default_low_stock_threshold


@router.get("", response_model=ProductListOut)
def list_products(
    q: Optional[str] = Query(default=None, max_length=120, description="Search name or SKU"),
    low_stock: Optional[bool] = Query(default=None, description="Only low-stock products"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProductListOut:
    default_threshold = current_default_threshold(db, current_user)

    query = db.query(Product).filter(
        Product.organization_id == current_user.organization_id
    )

    if q and q.strip():
        term = f"%{q.strip().lower()}%"
        query = query.filter(
            or_(func.lower(Product.name).like(term), func.lower(Product.sku).like(term))
        )

    products = query.order_by(Product.created_at.desc(), Product.id.desc()).all()
    items = [build_product_out(product, default_threshold) for product in products]

    if low_stock:
        items = [item for item in items if item.is_low_stock]

    return ProductListOut(
        items=items,
        total=len(items),
        default_low_stock_threshold=default_threshold,
    )


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProductOut:
    sku = payload.sku.strip().upper()
    ensure_sku_available(db, current_user.organization_id, sku)

    product = Product(
        organization_id=current_user.organization_id,
        name=payload.name,
        sku=sku,
        description=payload.description,
        quantity_on_hand=payload.quantity_on_hand,
        cost_price=payload.cost_price,
        selling_price=payload.selling_price,
        low_stock_threshold=payload.low_stock_threshold,
        created_at=utcnow(),
        updated_at=utcnow(),
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    return build_product_out(product, current_default_threshold(db, current_user))


@router.get("/{product_id}", response_model=ProductOut)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProductOut:
    product = get_owned_product(db, product_id, current_user.organization_id)
    return build_product_out(product, current_default_threshold(db, current_user))


@router.put("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProductOut:
    product = get_owned_product(db, product_id, current_user.organization_id)
    changes = payload.model_dump(exclude_unset=True)

    if "sku" in changes:
        sku = str(changes["sku"]).strip().upper()
        ensure_sku_available(
            db, current_user.organization_id, sku, exclude_product_id=product.id
        )
        changes["sku"] = sku

    for field, value in changes.items():
        setattr(product, field, value)

    product.updated_at = utcnow()
    db.commit()
    db.refresh(product)

    return build_product_out(product, current_default_threshold(db, current_user))


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    product = get_owned_product(db, product_id, current_user.organization_id)
    db.delete(product)
    db.commit()


@router.post("/{product_id}/stock", response_model=ProductOut)
def adjust_stock(
    product_id: int,
    payload: StockAdjustRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProductOut:
    product = get_owned_product(db, product_id, current_user.organization_id)
    quantity = product.quantity_on_hand or 0

    if payload.operation == "increase":
        new_quantity = quantity + payload.quantity
    elif payload.operation == "decrease":
        new_quantity = quantity - payload.quantity
    else:
        new_quantity = payload.quantity

    if new_quantity < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Stock quantity cannot become negative. "
                f"Current quantity on hand is {quantity}."
            ),
        )

    product.quantity_on_hand = new_quantity
    product.updated_at = utcnow()
    db.commit()
    db.refresh(product)

    return build_product_out(product, current_default_threshold(db, current_user))
