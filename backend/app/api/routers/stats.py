from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.base import get_db
from app.models import User
from app.services.stats import overview, rating_series

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/overview")
def stats_overview(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return overview(db, user.id)


@router.get("/heatmap")
def stats_heatmap(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from app.services.stats import build_heatmap
    return build_heatmap(db, user.id)


@router.get("/ratings")
def stats_ratings(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return rating_series(db, user.id)
