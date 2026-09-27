"""Plan builder: a LangGraph pipeline — analyze → draft → critique → refine → save."""

import json
from datetime import date, datetime
from typing import Literal, TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.ai.llm import get_llm
from app.ai.prompts import PLAN_CRITIQUE_SYSTEM, PLAN_DRAFT_SYSTEM
from app.models import Plan, PlanTask, User
from app.services.stats import overview, topic_analysis


class TaskOut(BaseModel):
    description: str = Field(description="A specific, checkable task")
    task_type: Literal["learn", "practice", "revise", "contest"] = "practice"
    target_count: int = Field(default=0, description="Number of problems to solve, if applicable")
    resource_url: str = ""


class DayOut(BaseModel):
    topic: str
    tasks: list[TaskOut]


class WeekOut(BaseModel):
    focus: str
    days: list[DayOut]


class PlanOut(BaseModel):
    title: str
    summary: str
    weeks: list[WeekOut]


class PlannerState(TypedDict):
    brief: str
    draft: dict
    critique: str
    final: dict


def _build_brief(db: Session, user: User, goal: str, target_date: date | None, hours_per_day: float) -> str:
    data = overview(db, user.id)
    topics = topic_analysis(db, user.id)
    sorted_topics = sorted(topics.items(), key=lambda kv: kv[1], reverse=True)
    strong = [name for name, count in sorted_topics[:8] if count > 0]
    weak = [name for name, count in sorted_topics[-10:] if count <= max(1, sorted_topics[len(sorted_topics) // 2][1])] if sorted_topics else []
    totals = data["totals"]

    days_available = 30
    if target_date:
        days_available = max(7, (target_date - date.today()).days)

    return (
        f"Student: {user.name} (college: {user.college or 'unknown'}, graduating: {user.grad_year or 'unknown'}).\n"
        f"GOAL: {goal}\n"
        f"TARGET DATE: {target_date.isoformat() if target_date else 'not specified (assume 30 days)'}\n"
        f"DAYS AVAILABLE: {days_available}\n"
        f"HOURS PER DAY: {hours_per_day}\n"
        f"Current stats: {totals['solved']} problems solved "
        f"(easy {totals['easy']}, medium {totals['medium']}, hard {totals['hard']}); "
        f"best rating {totals['rating'] or 'none'}; streak {totals['streak']} days.\n"
        f"Strong topics (most solved): {', '.join(strong) or 'none yet'}.\n"
        f"Weak topics (few or zero solved): {', '.join(weak) or 'unknown — assume beginner everywhere'}.\n"
    )


def _node_analyze(state: PlannerState) -> dict:
    return state  # brief already prepared before the graph starts


def _node_draft(state: PlannerState) -> dict:
    llm = get_llm(0.4).with_structured_output(PlanOut)
    plan = llm.invoke([
        SystemMessage(content=PLAN_DRAFT_SYSTEM),
        HumanMessage(content=state["brief"] + "\nProduce the full plan now. Every planned day must appear exactly once."),
    ])
    return {"draft": plan.model_dump()}


def _node_critique(state: PlannerState) -> dict:
    llm = get_llm(0.1)
    verdict = llm.invoke([
        SystemMessage(content=PLAN_CRITIQUE_SYSTEM),
        HumanMessage(content=state["brief"] + "\n\nDRAFT PLAN:\n" + json.dumps(state["draft"], indent=1)),
    ])
    return {"critique": verdict.content}


def _node_refine(state: PlannerState) -> dict:
    if state["critique"].strip().upper().startswith("OK"):
        return {"final": state["draft"]}
    llm = get_llm(0.2).with_structured_output(PlanOut)
    plan = llm.invoke([
        SystemMessage(content=PLAN_DRAFT_SYSTEM + "\nFix every issue listed in the critique."),
        HumanMessage(content=state["brief"] + "\n\nDRAFT:\n" + json.dumps(state["draft"])
                     + "\n\nCRITIQUE TO FIX:\n" + state["critique"]),
    ])
    return {"final": plan.model_dump()}


def _save(db: Session, user: User, final: dict, goal: str, target_date: date | None, hours_per_day: float) -> Plan:
    plan = Plan(
        user_id=user.id, goal=goal, target_date=target_date, hours_per_day=hours_per_day,
        title=final.get("title", "Study plan"), summary=final.get("summary", ""),
    )
    db.add(plan)
    db.flush()

    day_counter = 0
    for week_no, week in enumerate(final.get("weeks", []), start=1):
        for day in week.get("days", []):
            day_counter += 1
            for task in day.get("tasks", []):
                db.add(PlanTask(
                    plan_id=plan.id,
                    week_no=week_no,
                    day_no=day_counter,
                    topic=day.get("topic", ""),
                    description=task.get("description", ""),
                    task_type=task.get("task_type", "practice"),
                    resource_url=task.get("resource_url", ""),
                    target_count=task.get("target_count", 0),
                ))
    db.commit()
    db.refresh(plan)
    return plan


def build_plan(db: Session, user: User, goal: str, target_date: date | None, hours_per_day: float) -> Plan:
    brief = _build_brief(db, user, goal, target_date, hours_per_day)

    graph_state: PlannerState = {"brief": brief, "draft": {}, "critique": "", "final": {}}
    graph_state = _node_analyze(graph_state)
    graph_state.update(_node_draft(graph_state))
    graph_state.update(_node_critique(graph_state))
    graph_state.update(_node_refine(graph_state))

    return _save(db, user, graph_state["final"], goal, target_date, hours_per_day)


def serialize_plan(plan: Plan) -> dict:
    return {
        "id": plan.id,
        "title": plan.title,
        "goal": plan.goal,
        "summary": plan.summary,
        "hours_per_day": plan.hours_per_day,
        "target_date": plan.target_date.isoformat() if plan.target_date else None,
        "created_at": plan.created_at.isoformat() if plan.created_at else None,
        "tasks": [
            {
                "id": t.id, "week_no": t.week_no, "day_no": t.day_no, "topic": t.topic,
                "description": t.description, "task_type": t.task_type,
                "resource_url": t.resource_url, "target_count": t.target_count, "done": t.done,
            }
            for t in sorted(plan.tasks, key=lambda x: (x.day_no, x.id))
        ],
    }


def plan_started_at(plan: Plan) -> datetime:
    return plan.created_at
