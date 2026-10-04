from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.base import get_db
from app.models import User
from app.services.resume import CONVERSION_TEMPLATES, convert_resume_layout, generate_resume

router = APIRouter(prefix="/api/resume", tags=["resume"])


class ResumeIn(BaseModel):
    template: str = "modern"  # modern | classic
    include_plan: bool = True


@router.post("/convert")
async def convert_uploaded_resume(
    template: str = Form("modern"),
    resume_file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    if template not in CONVERSION_TEMPLATES:
        raise HTTPException(400, "Choose a valid resume template.")
    content = await resume_file.read(10 * 1024 * 1024 + 1)
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(413, "Resume files must be 10 MB or smaller.")
    try:
        pdf_bytes = convert_resume_layout(content, resume_file.filename or "resume", template)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{user.username}_resume_{template}.pdf"'},
    )


@router.post("")
def build(body: ResumeIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    pdf_bytes = generate_resume(db, user, template=body.template, include_plan=body.include_plan)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{user.username}_codebuddy_resume.pdf"'},
    )
