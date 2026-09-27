from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.models import User
from app.services.stats import build_heatmap, overview, rating_series

router = APIRouter(prefix="/api/public", tags=["portfolio"])


@router.get("/profile/{username}")
def public_profile(username: str, db: Session = Depends(get_db)):
    user = db.execute(select(User).where(User.username == username.lower())).scalars().first()
    if user is None:
        raise HTTPException(404, "Profile not found")
    data = overview(db, user.id)
    return {
        "name": user.name,
        "username": user.username,
        "college": user.college,
        "grad_year": user.grad_year,
        "member_since": user.created_at.isoformat(),
        "totals": data["totals"],
        "platforms": data["platforms"],
        "topics": data["topics"],
        "recent": data["recent"][:10],
        "ratings": rating_series(db, user.id),
        "heatmap": build_heatmap(db, user.id),
    }
