"""Seed a demo organization with products so the UI has something to show.

Usage (from the backend folder):
    python seed.py

Demo credentials:
    email:    demo@stockflow.app
    password: Demo123!
"""

from auth import hash_password
from database import SessionLocal, init_db
from models import Organization, OrganizationSettings, Product, User, utcnow

DEMO_EMAIL = "demo@stockflow.app"
DEMO_PASSWORD = "Demo123!"
DEMO_ORG = "Northwind Traders"

DEMO_PRODUCTS = [
    {"name": "Wireless Mouse", "sku": "WM-100", "description": "2.4 GHz ergonomic mouse", "quantity": 48, "cost": 8.50, "price": 19.99, "threshold": 10},
    {"name": "Mechanical Keyboard", "sku": "KB-220", "description": "Hot-swappable RGB keyboard", "quantity": 12, "cost": 42.00, "price": 89.00, "threshold": 8},
    {"name": "27\" QHD Monitor", "sku": "MON-27Q", "description": "2560x1440 IPS display", "quantity": 6, "cost": 165.00, "price": 279.00, "threshold": 5},
    {"name": "USB-C Hub", "sku": "HUB-C7", "description": "7-in-1 aluminium hub", "quantity": 3, "cost": 21.40, "price": 49.00, "threshold": 6},
    {"name": "Laptop Stand", "sku": "STD-AL1", "description": "Adjustable aluminium stand", "quantity": 0, "cost": 14.00, "price": 34.50, "threshold": 4},
    {"name": "Noise Cancelling Headphones", "sku": "HP-NC9", "description": "Over-ear ANC headset", "quantity": 21, "cost": 78.00, "price": 149.00, "threshold": 6},
    {"name": "Webcam 1080p", "sku": "CAM-1080", "description": "Full HD webcam with mic", "quantity": 9, "cost": 25.75, "price": 59.99, "threshold": 10},
    {"name": "Desk Cable Tray", "sku": "TRAY-01", "description": "Under-desk cable management", "quantity": 34, "cost": 6.20, "price": 15.00, "threshold": None},
]


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == DEMO_EMAIL).first()
        if existing is not None:
            print(f"Demo data already present for {DEMO_EMAIL}")
            return

        organization = Organization(name=DEMO_ORG, created_at=utcnow())
        db.add(organization)
        db.flush()

        db.add(
            OrganizationSettings(
                organization_id=organization.id, default_low_stock_threshold=5
            )
        )
        db.add(
            User(
                full_name="Demo Manager",
                email=DEMO_EMAIL,
                password_hash=hash_password(DEMO_PASSWORD),
                organization_id=organization.id,
                created_at=utcnow(),
            )
        )
        for item in DEMO_PRODUCTS:
            db.add(
                Product(
                    organization_id=organization.id,
                    name=item["name"],
                    sku=item["sku"],
                    description=item["description"],
                    quantity_on_hand=item["quantity"],
                    cost_price=item["cost"],
                    selling_price=item["price"],
                    low_stock_threshold=item["threshold"],
                    created_at=utcnow(),
                    updated_at=utcnow(),
                )
            )
        db.commit()
        print(f"Seeded organization '{DEMO_ORG}' with {len(DEMO_PRODUCTS)} products.")
        print(f"Login with {DEMO_EMAIL} / {DEMO_PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
