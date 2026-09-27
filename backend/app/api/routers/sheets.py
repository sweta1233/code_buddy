from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.base import get_db
from app.models import Sheet, SheetProgress, SheetQuestion, User
from app.services.sheets import sheet_with_progress

router = APIRouter(prefix="/api/sheets", tags=["sheets"])


class MarkIn(BaseModel):
    status: str  # todo | done | revision


@router.get("")
def list_sheets(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sheets = db.execute(select(Sheet)).scalars().all()
    return {
        "sheets": [
            {"slug": s.slug, "name": s.name, "description": s.description, "total": len(s.questions)}
            for s in sheets
        ]
    }


@router.get("/{slug}")
def get_sheet(slug: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    result = sheet_with_progress(db, slug, user.id)
    if result is None:
        raise HTTPException(404, "Sheet not found")
    return result


@router.post("/{slug}/questions/{question_id}")
def mark_question(slug: str, question_id: int, body: MarkIn, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    if body.status not in ("todo", "done", "revision"):
        raise HTTPException(400, "status must be todo, done or revision")
    question = db.get(SheetQuestion, question_id)
    if question is None:
        raise HTTPException(404, "Question not found")
    sheet = db.get(Sheet, question.sheet_id)
    if sheet is None or sheet.slug != slug:
        raise HTTPException(404, "Question not in this sheet")

    progress = db.execute(
        select(SheetProgress).where(
            SheetProgress.user_id == user.id, SheetProgress.question_id == question_id
        )
    ).scalars().first()
    if progress is None:
        progress = SheetProgress(user_id=user.id, question_id=question_id)
        db.add(progress)
    progress.status = body.status
    db.commit()
    return {"question_id": question_id, "status": progress.status}
