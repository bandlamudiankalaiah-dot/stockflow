"""Dashboard aggregation endpoints computed from live database rows."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import Product, User
from products import build_product_out, current_default_threshold
from schemas import DashboardSummaryOut, ProductListOut

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _organization_products(db: Session, organization_id: int):
    return (
        db.query(Product)
        .filter(Product.organization_id == organization_id)
        .order_by(Product.quantity_on_hand.asc(), Product.name.asc())
        .all()
    )


@router.get("/summary", response_model=DashboardSummaryOut)
def dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DashboardSummaryOut:
    default_threshold = current_default_threshold(db, current_user)
    products = _organization_products(db, current_user.organization_id)

    items = [build_product_out(product, default_threshold) for product in products]

    return DashboardSummaryOut(
        total_products=len(items),
        total_stock_quantity=sum(item.quantity_on_hand for item in items),
        low_stock_products=sum(1 for item in items if item.is_low_stock),
        inventory_value=round(sum(item.inventory_value for item in items), 2),
        default_low_stock_threshold=default_threshold,
    )


@router.get("/low-stock", response_model=ProductListOut)
def low_stock_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProductListOut:
    default_threshold = current_default_threshold(db, current_user)
    products = _organization_products(db, current_user.organization_id)

    items = [
        item
        for item in (build_product_out(product, default_threshold) for product in products)
        if item.is_low_stock
    ]

    return ProductListOut(
        items=items,
        total=len(items),
        default_low_stock_threshold=default_threshold,
    )
