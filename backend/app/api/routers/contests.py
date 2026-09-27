from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.base import get_db
from app.services.contests import get_upcoming_contests

router = APIRouter(prefix="/api/contests", tags=["contests"])


@router.get("")
def upcoming(user=Depends(get_current_user), db: Session = Depends(get_db)):
    return {"contests": get_upcoming_contests(db)}
