"""Plan builder: a LangGraph pipeline — analyze → draft → critique → refine → save."""

import json
import logging
import math
from datetime import date, datetime, timedelta
from typing import Literal, TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.ai.llm import get_llm
from app.ai.prompts import (
    DAILY_ROUTINE_CRITIQUE_SYSTEM,
    DAILY_ROUTINE_DRAFT_SYSTEM,
    PLAN_CRITIQUE_SYSTEM,
    PLAN_DRAFT_SYSTEM,
)
from app.ai.knowledge_base import KNOWLEDGE
from app.models import Plan, PlanTask, User
from app.services.stats import overview, topic_analysis

logger = logging.getLogger(__name__)


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


class TimeSlotOut(BaseModel):
    time_range: str = Field(description="e.g. '08:00 AM - 09:30 AM'")
    title: str = Field(description="Slot title, e.g. 'Morning Deep Work: DP State Transitions'")
    activity_type: Literal["theory", "coding", "contest", "review", "break", "college_work"] = "coding"
    duration_minutes: int = Field(default=60, description="Duration in minutes")
    description: str = Field(description="What to accomplish in this slot")
    target_problems: list[str] = Field(default_factory=list, description="Specific problems or problem patterns to solve")
    checklist: list[str] = Field(default_factory=list, description="Actionable checklist for this slot")
    tips: str = Field(default="", description="Efficiency or mindset tip for this slot")


class DailyRoutineOut(BaseModel):
    title: str = Field(description="e.g. 'High-Output DSA Day: Dynamic Programming Mastery'")
    focus_theme: str = Field(description="Main topic or focus theme for today")
    total_study_hours: float = Field(description="Total dedicated study hours")
    summary: str = Field(description="Overview of how today will be executed")
    slots: list[TimeSlotOut] = Field(description="Time-blocked schedule slots across the day")
    pro_tip: str = Field(description="Key mindset or strategy tip for maximum retention today")


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
    platform_stats = []
    for platform in data["platforms"]:
        stats = platform.get("stats") or {}
        platform_stats.append(
            f"{platform['platform']} (@{platform['handle']}): {stats.get('total_solved', 0)} solved "
            f"(easy {stats.get('easy', 'unknown')}, medium {stats.get('medium', 'unknown')}, "
            f"hard {stats.get('hard', 'unknown')})"
        )

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
        f"Per-platform synced totals: {'; '.join(platform_stats) or 'no profiles synced yet'}.\n"
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


def _fallback_plan_data(db: Session, user: User, goal: str, target_date: date | None,
                        hours_per_day: float) -> dict:
    """Create a useful plan from saved profile stats without requiring an LLM/API key."""
    data = overview(db, user.id)
    totals = data["totals"]
    topic_counts = topic_analysis(db, user.id)
    catalog = [entry["content"].split(":", 1)[0] for entry in KNOWLEDGE]
    known = {name.casefold(): name for name in catalog}
    for name in topic_counts:
        known.setdefault(name.casefold(), name)
    weak_topics = sorted(known.values(), key=lambda topic: topic_counts.get(topic, 0))[:8]
    if not weak_topics:
        weak_topics = ["Arrays & Hashing", "Two Pointers", "Trees", "Dynamic Programming"]

    solved = totals["solved"]
    if solved < 20:
        level, target_difficulty = "beginner", "easy"
    elif totals["hard"] >= max(5, totals["medium"]):
        level, target_difficulty = "advanced", "hard"
    else:
        level, target_difficulty = "developing", "medium"

    days = max(1, (target_date - date.today()).days) if target_date else 30
    week_count = math.ceil(days / 7)
    problems_per_day = max(1, min(6, round(hours_per_day * (1.25 if level == "beginner" else 1.75))))
    weeks = []
    day_index = 0
    for week_no in range(week_count):
        week_days = []
        for _ in range(min(7, days - day_index)):
            topic = weak_topics[day_index % len(weak_topics)]
            if day_index % 7 == 6:
                tasks = [{
                    "description": f"Review this week's {topic} notes and retry 1 previously missed problem.",
                    "task_type": "revise", "target_count": 1,
                    "resource_url": f"https://leetcode.com/tag/{topic.lower().replace(' ', '-')}/",
                }]
            else:
                tasks = [
                    {
                        "description": f"Study the core {topic} pattern for {max(15, round(hours_per_day * 15))} minutes, then solve {problems_per_day} {target_difficulty} problem(s).",
                        "task_type": "learn" if topic_counts.get(topic, 0) == 0 else "practice",
                        "target_count": problems_per_day,
                        "resource_url": f"https://leetcode.com/tag/{topic.lower().replace(' ', '-')}/",
                    },
                    {
                        "description": f"Write down the approach and complexity for today's {topic} problems; retry any failed case without looking at the solution.",
                        "task_type": "revise", "target_count": 0, "resource_url": "",
                    },
                ]
            week_days.append({"topic": topic, "tasks": tasks})
            day_index += 1
        weeks.append({"focus": weak_topics[week_no % len(weak_topics)], "days": week_days})

    return {
        "title": f"Profile-based plan: {goal[:70]}",
        "summary": (
            f"Built from your latest synced profile: {solved} solved "
            f"({totals['easy']} easy, {totals['medium']} medium, {totals['hard']} hard). "
            "Topics with the fewest recorded solves are scheduled first. "
            "The Gemini service was unavailable, so this plan uses the local stats-based planner."
        ),
        "weeks": weeks,
    }


def build_plan(db: Session, user: User, goal: str, target_date: date | None, hours_per_day: float) -> Plan:
    brief = _build_brief(db, user, goal, target_date, hours_per_day)

    try:
        graph_state: PlannerState = {"brief": brief, "draft": {}, "critique": "", "final": {}}
        graph_state = _node_analyze(graph_state)
        graph_state.update(_node_draft(graph_state))
        graph_state.update(_node_critique(graph_state))
        graph_state.update(_node_refine(graph_state))
        final = graph_state["final"]
    except Exception as exc:
        logger.warning("LLM plan generation unavailable; using synced profile data: %s", exc)
        final = _fallback_plan_data(db, user, goal, target_date, hours_per_day)

    return _save(db, user, final, goal, target_date, hours_per_day)


def _fallback_daily_routine(available_hours: float, wake_time: str, focus_topic: str,
                           weak_topics: list[str], solved: int) -> dict:
    total_minutes = max(1, round(available_hours * 60))
    warmup = max(1, round(total_minutes * 0.2))
    review = max(1, round(total_minutes * 0.2))
    coding = total_minutes - warmup - review
    try:
        parsed = datetime.strptime(wake_time.strip(), "%I:%M %p")
        cursor = parsed.hour * 60 + parsed.minute
    except ValueError:
        cursor = 7 * 60 + 30

    def clock(value: int) -> str:
        value %= 24 * 60
        return datetime.strptime(f"{value // 60:02d}:{value % 60:02d}", "%H:%M").strftime("%I:%M %p")

    focus = focus_topic or (weak_topics[0] if weak_topics else "Arrays & Hashing")
    difficulty = "easy" if solved < 20 else "medium"
    problems = max(1, min(5, round(available_hours * (1.25 if solved < 20 else 1.75))))
    slots = []

    def add_slot(title: str, kind: str, duration: int, description: str,
                 targets: list[str], checklist: list[str], tips: str = "") -> None:
        nonlocal cursor
        end = cursor + duration
        slots.append({
            "time_range": f"{clock(cursor)} - {clock(end)}", "title": title,
            "activity_type": kind, "duration_minutes": duration,
            "description": description, "target_problems": targets,
            "checklist": checklist, "tips": tips,
        })
        cursor = end

    add_slot(
        f"Warm up: {focus}", "theory", warmup,
        f"Review the main {focus} pattern and the mistakes you have made in similar problems.", [],
        ["State the pattern in your own words", "Write down one edge case"],
    )

    remaining = coding
    block_no = 1
    while remaining > 0:
        block = min(90, remaining)
        add_slot(
            f"Focused practice: {focus} ({block_no})", "coding", block,
            f"Solve {problems} {difficulty} problem(s) on {focus}. Attempt each before reading hints.",
            [f"{difficulty} {focus} problems"],
            ["Record the approach", "Check time and space complexity", "Review failed test cases"],
            "Take a short break before the next coding block." if remaining > block else "",
        )
        remaining -= block
        block_no += 1
        if remaining > 0:
            add_slot("Short break", "break", 10, "Step away from the screen and reset.", [], [])

    add_slot(
        "Recall and review", "review", review,
        f"Revisit today's {focus} solutions and write one lesson to carry into your next session.",
        [], ["Re-solve one difficult step from memory", "Log the next topic to practice"],
    )
    return {
        "title": f"Profile-based routine: {focus}", "focus_theme": focus,
        "total_study_hours": available_hours,
        "summary": (
            f"This routine uses your synced total of {solved} solved problems and prioritizes "
            f"{focus}. The Gemini service was unavailable, so the schedule was built locally."
        ),
        "slots": slots,
        "pro_tip": "Attempt problems before opening editorials; record one specific lesson from every failed attempt.",
    }


def build_daily_routine(
    db: Session,
    user: User,
    available_hours: float,
    wake_time: str = "07:30 AM",
    busy_hours_desc: str = "",
    focus_topic: str = "",
) -> dict:
    """Build a time-blocked whole-day study routine using a LangGraph-style draft -> critique -> refine workflow."""
    data = overview(db, user.id)
    totals = data["totals"]
    topics = topic_analysis(db, user.id)
    sorted_topics = sorted(topics.items(), key=lambda kv: kv[1], reverse=True)
    weak_topics = [name for name, count in sorted_topics[-8:] if count <= 2] if sorted_topics else []

    chosen_focus = focus_topic or (weak_topics[0] if weak_topics else "Arrays & Dynamic Programming")

    brief = (
        f"Student: {user.name}\n"
        f"Available Study Time Today: {available_hours} hours\n"
        f"Wake up time: {wake_time}\n"
        f"College / Job / Other commitments: {busy_hours_desc or 'Full day open for coding'}\n"
        f"Primary target topic for today: {chosen_focus}\n"
        f"Total solved so far: {totals['solved']} (Easy: {totals['easy']}, Medium: {totals['medium']}, Hard: {totals['hard']})\n"
        f"Recent weak topics: {', '.join(weak_topics) or 'None identified'}\n"
    )

    try:
        llm_draft = get_llm(0.3).with_structured_output(DailyRoutineOut)
        draft = llm_draft.invoke([
            SystemMessage(content=DAILY_ROUTINE_DRAFT_SYSTEM),
            HumanMessage(content=brief + "\nDraft the complete time-blocked 24h day schedule now."),
        ])

        llm_critique = get_llm(0.1)
        critique = llm_critique.invoke([
            SystemMessage(content=DAILY_ROUTINE_CRITIQUE_SYSTEM),
            HumanMessage(content=brief + "\n\nDRAFT ROUTINE:\n" + json.dumps(draft.model_dump(), indent=2)),
        ])

        if critique.content.strip().upper().startswith("OK"):
            return draft.model_dump()

        llm_refine = get_llm(0.2).with_structured_output(DailyRoutineOut)
        refined = llm_refine.invoke([
            SystemMessage(content=DAILY_ROUTINE_DRAFT_SYSTEM + "\nFix any pacing or timing issues from critique."),
            HumanMessage(
                content=brief
                + "\n\nDRAFT ROUTINE:\n"
                + json.dumps(draft.model_dump())
                + "\n\nCRITIQUE TO ADDRESS:\n"
                + critique.content
            ),
        ])
        return refined.model_dump()
    except Exception as exc:
        logger.warning("LLM daily routine unavailable; using synced profile data: %s", exc)
        return _fallback_daily_routine(available_hours, wake_time, chosen_focus, weak_topics, totals["solved"])


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
