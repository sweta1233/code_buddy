from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.base import get_db
from app.services.contests import build_ics_calendar, get_upcoming_contests, get_upcoming_contests_result

router = APIRouter(prefix="/api/contests", tags=["contests"])


@router.get("")
def upcoming(
    force_refresh: bool = Query(default=False),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_upcoming_contests_result(db, force_refresh=force_refresh)


@router.get("/export.ics")
def export_ics(user=Depends(get_current_user), db: Session = Depends(get_db)):
    contests = get_upcoming_contests(db)
    ics_data = build_ics_calendar(contests)
    return Response(
        content=ics_data,
        media_type="text/calendar",
        headers={"Content-Disposition": "attachment; filename=codebuddy-contests.ics"},
    )
