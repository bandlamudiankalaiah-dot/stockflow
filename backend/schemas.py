"""Pydantic request/response schemas with validation rules."""

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)


# --------------------------------------------------------------------------- #
# Organization / authentication
# --------------------------------------------------------------------------- #
class OrganizationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    created_at: datetime


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: EmailStr
    organization_id: int
    created_at: datetime


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    confirm_password: str = Field(min_length=6, max_length=128)
    organization_name: str = Field(min_length=2, max_length=160)

    @field_validator("full_name", "organization_name")
    @classmethod
    def strip_text(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 2:
            raise ValueError("must be at least 2 characters long")
        return cleaned

    @model_validator(mode="after")
    def passwords_match(self) -> "RegisterRequest":
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
    organization: OrganizationOut


# --------------------------------------------------------------------------- #
# Products
# --------------------------------------------------------------------------- #
class ProductBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    sku: str = Field(min_length=1, max_length=80)
    description: Optional[str] = Field(default=None, max_length=2000)
    quantity_on_hand: int = Field(default=0, ge=0)
    cost_price: Optional[float] = Field(default=None, ge=0)
    selling_price: Optional[float] = Field(default=None, ge=0)
    low_stock_threshold: Optional[int] = Field(default=None, ge=0)

    @field_validator("name", "sku")
    @classmethod
    def strip_required(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("cannot be empty")
        return cleaned

    @field_validator("description")
    @classmethod
    def strip_description(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    sku: Optional[str] = Field(default=None, min_length=1, max_length=80)
    description: Optional[str] = Field(default=None, max_length=2000)
    quantity_on_hand: Optional[int] = Field(default=None, ge=0)
    cost_price: Optional[float] = Field(default=None, ge=0)
    selling_price: Optional[float] = Field(default=None, ge=0)
    low_stock_threshold: Optional[int] = Field(default=None, ge=0)

    @field_validator("name", "sku")
    @classmethod
    def strip_required(cls, value: Optional[str]) -> str:
        if value is None or not value.strip():
            raise ValueError("cannot be empty")
        return value.strip()

    @field_validator("description")
    @classmethod
    def strip_description(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class ProductOut(BaseModel):
    id: int
    organization_id: int
    name: str
    sku: str
    description: Optional[str] = None
    quantity_on_hand: int
    cost_price: Optional[float] = None
    selling_price: Optional[float] = None
    low_stock_threshold: Optional[int] = None
    effective_threshold: int
    is_low_stock: bool
    status: str
    inventory_value: float
    created_at: datetime
    updated_at: datetime


class ProductListOut(BaseModel):
    items: List[ProductOut]
    total: int
    default_low_stock_threshold: int


class StockAdjustRequest(BaseModel):
    operation: Literal["increase", "decrease", "set"]
    quantity: int = Field(ge=0, le=1_000_000)

    @model_validator(mode="after")
    def require_positive_adjustment(self) -> "StockAdjustRequest":
        if self.operation in ("increase", "decrease") and self.quantity <= 0:
            raise ValueError("quantity must be greater than 0 when adjusting stock")
        return self


# --------------------------------------------------------------------------- #
# Dashboard
# --------------------------------------------------------------------------- #
class DashboardSummaryOut(BaseModel):
    total_products: int
    total_stock_quantity: int
    low_stock_products: int
    inventory_value: float
    default_low_stock_threshold: int


# --------------------------------------------------------------------------- #
# Settings
# --------------------------------------------------------------------------- #
class SettingsOut(BaseModel):
    organization_id: int
    organization_name: str
    default_low_stock_threshold: int
    updated_at: Optional[datetime] = None


class SettingsUpdate(BaseModel):
    organization_name: str = Field(min_length=2, max_length=160)
    default_low_stock_threshold: int = Field(ge=0, le=100_000)

    @field_validator("organization_name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 2:
            raise ValueError("Organization name must be at least 2 characters long")
        return cleaned


class MeResponse(BaseModel):
    user: UserOut
    organization: OrganizationOut
    settings: SettingsOut
