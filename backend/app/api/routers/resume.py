from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.base import get_db
from app.models import User
from app.services.resume import generate_resume

router = APIRouter(prefix="/api/resume", tags=["resume"])


class ResumeIn(BaseModel):
    template: str = "modern"  # modern | classic
    include_plan: bool = True


@router.post("")
def build(body: ResumeIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    pdf_bytes = generate_resume(db, user, template=body.template, include_plan=body.include_plan)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{user.username}_codebuddy_resume.pdf"'},
    )
