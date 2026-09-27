"""Sheets: seeding from bundled JSON + progress helpers."""

import json
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.base import SessionLocal
from app.models import Sheet, SheetProgress, SheetQuestion

DATA_DIR = Path(__file__).resolve().parent / "sheets_data"


def seed_sheets() -> None:
    """Create/update the Sheet + SheetQuestion rows from bundled JSON files. Idempotent."""
    db = SessionLocal()
    try:
        for path in sorted(DATA_DIR.glob("*.json")):
            data = json.loads(path.read_text(encoding="utf-8"))
            sheet = db.execute(select(Sheet).where(Sheet.slug == data["slug"])).scalars().first()
            if sheet is None:
                sheet = Sheet(slug=data["slug"], name=data["name"], description=data.get("description", ""),
                              source_url=data.get("source_url", ""))
                db.add(sheet)
                db.flush()
            else:
                db.query(SheetQuestion).filter(SheetQuestion.sheet_id == sheet.id).delete()
            for i, q in enumerate(data["questions"]):
                db.add(SheetQuestion(
                    sheet_id=sheet.id, order_no=i, title=q["title"], slug=q.get("slug", ""),
                    url=q.get("url", ""), difficulty=q.get("difficulty", ""), topics=q.get("topics", []),
                ))
        db.commit()
    finally:
        db.close()


def sheet_with_progress(db: Session, sheet_slug: str, user_id: int) -> dict | None:
    sheet = db.execute(select(Sheet).where(Sheet.slug == sheet_slug)).scalars().first()
    if sheet is None:
        return None
    progress = {
        p.question_id: p.status
        for p in db.execute(
            select(SheetProgress).where(
                SheetProgress.user_id == user_id,
                SheetProgress.question_id.in_([q.id for q in sheet.questions]),
            )
        ).scalars()
    }
    questions = [
        {
            "id": q.id, "order": q.order_no, "title": q.title, "slug": q.slug, "url": q.url,
            "difficulty": q.difficulty, "topics": q.topics, "status": progress.get(q.id, "todo"),
        }
        for q in sorted(sheet.questions, key=lambda x: x.order_no)
    ]
    done = sum(1 for q in questions if q["status"] == "done")
    return {
        "slug": sheet.slug, "name": sheet.name, "description": sheet.description,
        "source_url": sheet.source_url, "total": len(questions), "done": done, "questions": questions,
    }
