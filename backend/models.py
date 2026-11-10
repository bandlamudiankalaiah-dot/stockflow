"""SQLAlchemy models for StockFlow.

Tables: organizations, users, products, organization_settings.
Every product and user belongs to exactly one organization; all API queries are
scoped by the organization of the authenticated user.
"""

import os
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from database import Base

DEFAULT_LOW_STOCK_THRESHOLD = int(os.getenv("DEFAULT_LOW_STOCK_THRESHOLD", "5"))


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(160), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    users = relationship("User", back_populates="organization")
    products = relationship(
        "Product", back_populates="organization", cascade="all, delete-orphan"
    )
    settings = relationship(
        "OrganizationSettings",
        back_populates="organization",
        uselist=False,
        cascade="all, delete-orphan",
    )


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    organization_id = Column(
        Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    organization = relationship("Organization", back_populates="users")


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        UniqueConstraint("organization_id", "sku", name="uq_products_organization_sku"),
    )

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(200), nullable=False, index=True)
    sku = Column(String(80), nullable=False, index=True)
    description = Column(Text, nullable=True)
    quantity_on_hand = Column(Integer, nullable=False, default=0)
    cost_price = Column(Numeric(12, 2), nullable=True)
    selling_price = Column(Numeric(12, 2), nullable=True)
    low_stock_threshold = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    organization = relationship("Organization", back_populates="products")


class OrganizationSettings(Base):
    __tablename__ = "organization_settings"

    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        primary_key=True,
    )
    default_low_stock_threshold = Column(
        Integer, nullable=False, default=DEFAULT_LOW_STOCK_THRESHOLD
    )
    updated_at = Column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )

    organization = relationship("Organization", back_populates="settings")


def get_or_create_settings(db, organization_id: int) -> OrganizationSettings:
    """Return the settings row for an organization, creating it when missing."""
    settings = (
        db.query(OrganizationSettings)
        .filter(OrganizationSettings.organization_id == organization_id)
        .first()
    )
    if settings is None:
        settings = OrganizationSettings(
            organization_id=organization_id,
            default_low_stock_threshold=DEFAULT_LOW_STOCK_THRESHOLD,
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings
