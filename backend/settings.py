"""Organization settings endpoints (name and default low-stock threshold)."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth import build_settings_out, get_current_user
from database import get_db
from models import Organization, User, get_or_create_settings, utcnow
from schemas import SettingsOut, SettingsUpdate

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("", response_model=SettingsOut)
def read_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SettingsOut:
    return build_settings_out(db, current_user)


@router.put("", response_model=SettingsOut)
def update_settings(
    payload: SettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SettingsOut:
    organization = db.get(Organization, current_user.organization_id)
    if organization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found"
        )

    organization.name = payload.organization_name
    settings = get_or_create_settings(db, current_user.organization_id)
    settings.default_low_stock_threshold = payload.default_low_stock_threshold
    settings.updated_at = utcnow()

    db.commit()
    db.refresh(settings)

    return build_settings_out(db, current_user)
