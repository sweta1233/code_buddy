from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.planner import build_plan, serialize_plan
from app.api.deps import get_current_user
from app.db.base import get_db
from app.models import Plan, PlanTask, User

router = APIRouter(prefix="/api/plans", tags=["plans"])


class GenerateIn(BaseModel):
    goal: str = Field(min_length=5, max_length=2000)
    target_date: date | None = None
    hours_per_day: float = Field(default=2.0, ge=0.5, le=16)


class TaskPatchIn(BaseModel):
    done: bool


@router.get("")
def list_plans(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plans = db.execute(
        select(Plan).where(Plan.user_id == user.id).order_by(Plan.created_at.desc())
    ).scalars().all()
    return {"plans": [{"id": p.id, "title": p.title, "status": p.status, "created_at": p.created_at.isoformat()} for p in plans]}


@router.get("/current")
def current_plan(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    plan = db.execute(
        select(Plan).where(Plan.user_id == user.id, Plan.status == "active").order_by(Plan.created_at.desc())
    ).scalars().first()
    if plan is None:
        return {"plan": None}
    return {"plan": serialize_plan(plan)}


@router.post("/generate")
def generate(body: GenerateIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # One active plan at a time keeps the mentor's context clean; older ones stay in history.
    for old in db.execute(
        select(Plan).where(Plan.user_id == user.id, Plan.status == "active")
    ).scalars().all():
        old.status = "archived"
    db.commit()

    try:
        plan = build_plan(db, user, body.goal.strip(), body.target_date, body.hours_per_day)
    except Exception as exc:
        raise HTTPException(502, f"Plan generation failed: {exc}") from exc
    return {"plan": serialize_plan(plan)}


@router.patch("/tasks/{task_id}")
def patch_task(task_id: int, body: TaskPatchIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.get(PlanTask, task_id)
    if task is None:
        raise HTTPException(404, "Task not found")
    plan = db.get(Plan, task.plan_id)
    if plan is None or plan.user_id != user.id:
        raise HTTPException(403, "Not your plan")
    task.done = body.done
    db.commit()
    return {"id": task.id, "done": task.done}
