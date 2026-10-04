from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.base import get_db
from app.models import PlatformAccount, Snapshot, User
from app.services.platforms import SUPPORTED_PLATFORMS
from app.services.platforms.base import PlatformError, normalize_handle
from app.services.sync import sync_account, sync_user

router = APIRouter(prefix="/api/platforms", tags=["platforms"])


class ConnectIn(BaseModel):
    platform: str
    handle: str


def _account_out(a: PlatformAccount, db: Session) -> dict:
    snapshot = db.execute(
        select(Snapshot).where(
            Snapshot.user_id == a.user_id, Snapshot.platform == a.platform
        ).order_by(Snapshot.captured_at.desc()).limit(1)
    ).scalars().first()
    return {
        "platform": a.platform, "handle": a.handle, "status": a.last_status,
        "last_error": a.last_error,
        "last_synced_at": a.last_synced_at.isoformat() if a.last_synced_at else None,
        "stats": snapshot.stats if snapshot else {},
    }


@router.get("")
def list_platforms(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return {"supported": SUPPORTED_PLATFORMS, "accounts": [_account_out(a, db) for a in user.accounts]}


@router.post("/connect")
def connect(body: ConnectIn, background: BackgroundTasks, db: Session = Depends(get_db),
            user: User = Depends(get_current_user)):
    if body.platform not in SUPPORTED_PLATFORMS:
        raise HTTPException(400, f"Unsupported platform. Choose from {SUPPORTED_PLATFORMS}")
    try:
        handle = normalize_handle(body.platform, body.handle)
    except PlatformError as exc:
        raise HTTPException(400, str(exc)) from exc
    existing = db.execute(
        select(PlatformAccount).where(
            PlatformAccount.user_id == user.id, PlatformAccount.platform == body.platform
        )
    ).scalars().first()
    if existing:
        existing.handle = handle
        existing.last_status = "pending"
        existing.last_error = ""
        account = existing
    else:
        account = PlatformAccount(user_id=user.id, platform=body.platform, handle=handle)
        db.add(account)
    db.commit()
    db.refresh(account)

    background.add_task(_sync_in_background, user.id, account.id)
    return _account_out(account, db)


def _sync_in_background(user_id: int, account_id: int) -> None:
    db = next(get_db())
    try:
        account = db.get(PlatformAccount, account_id)
        if account:
            sync_account(db, account)
    finally:
        db.close()


@router.post("/sync")
def sync_all(background: BackgroundTasks, user: User = Depends(get_current_user)):
    background.add_task(_sync_all_in_background, user.id)
    return {"started": True}


def _sync_all_in_background(user_id: int) -> None:
    db = next(get_db())
    try:
        sync_user(db, user_id)
    finally:
        db.close()


@router.delete("/{platform}")
def disconnect(platform: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    account = db.execute(
        select(PlatformAccount).where(PlatformAccount.user_id == user.id, PlatformAccount.platform == platform)
    ).scalars().first()
    if account is None:
        raise HTTPException(404, "Platform not connected")
    db.delete(account)
    db.commit()
    return {"deleted": True}
