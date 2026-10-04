import hashlib

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.base import get_db
from app.models import Sheet, SheetOwner, SheetProgress, SheetQuestion, User
from app.services.sheets import fetch_public_sheet, sheet_with_progress

router = APIRouter(prefix="/api/sheets", tags=["sheets"])


class MarkIn(BaseModel):
    status: str  # todo | done | revision


class ImportSheetIn(BaseModel):
    url: str


@router.get("")
def list_sheets(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sheets = db.execute(
        select(Sheet).outerjoin(SheetOwner, SheetOwner.sheet_id == Sheet.id).where(
            or_(SheetOwner.id.is_(None), SheetOwner.user_id == user.id)
        )
    ).scalars().unique().all()
    return {
        "sheets": [
            {"slug": s.slug, "name": s.name, "description": s.description,
             "total": len(s.questions), "done": sheet_with_progress(db, s.slug, user.id)["done"]}
            for s in sheets
        ]
    }


@router.post("/import")
def import_sheet(body: ImportSheetIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        name, description, questions = fetch_public_sheet(body.url)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(502, "Could not fetch that public sheet right now. Try the link again later.") from exc

    canonical_url = body.url.strip()
    digest = hashlib.sha256(canonical_url.lower().encode("utf-8")).hexdigest()[:12]
    slug = f"custom-{user.id}-{digest}"
    sheet = db.execute(select(Sheet).where(Sheet.slug == slug)).scalars().first()
    if sheet is None:
        sheet = Sheet(slug=slug, name=name, description=description, source_url=canonical_url)
        db.add(sheet)
        db.flush()
        db.add(SheetOwner(user_id=user.id, sheet_id=sheet.id))
        for order_no, question in enumerate(questions):
            db.add(SheetQuestion(sheet_id=sheet.id, order_no=order_no, **question))
        db.commit()
    result = sheet_with_progress(db, slug, user.id)
    return {key: result[key] for key in ("slug", "name", "description", "total", "done")}


def _user_can_access(db: Session, sheet: Sheet, user_id: int) -> bool:
    owner = db.execute(select(SheetOwner).where(SheetOwner.sheet_id == sheet.id)).scalars().first()
    return owner is None or owner.user_id == user_id


@router.get("/{slug}")
def get_sheet(slug: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sheet = db.execute(select(Sheet).where(Sheet.slug == slug)).scalars().first()
    if sheet is None or not _user_can_access(db, sheet, user.id):
        raise HTTPException(404, "Sheet not found")
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
    if sheet is None or sheet.slug != slug or not _user_can_access(db, sheet, user.id):
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
