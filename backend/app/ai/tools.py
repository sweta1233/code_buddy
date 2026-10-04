"""LangChain tools the mentor agent can call — each factory closure is bound to one user's DB session."""

import json

from langchain_core.tools import tool
from sqlalchemy import String, cast, select
from sqlalchemy.orm import Session

from app.ai.planner import build_daily_routine
from app.ai.rag import search_knowledge, search_my_problems
from app.models import ContestRecord, Plan, PlanTask, Submission, User
from app.services.contests import get_upcoming_contests
from app.services.stats import overview


def build_user_tools(db: Session, user_id: int) -> list:
    user = db.get(User, user_id)

    @tool
    def get_my_stats() -> str:
        """Get the student's aggregated coding stats across all connected platforms: totals, difficulty split, per-platform ratings, top topics, streak, and recent submissions. Call this before any question about 'how many/much'."""
        return json.dumps(overview(db, user_id), default=str)

    @tool
    def query_solved(topic: str = "", difficulty: str = "", limit: int = 20) -> str:
        """Search the student's solved problem rows. Optionally filter by a topic keyword (e.g. 'graph', 'dp') and difficulty ('easy'|'medium'|'hard'). Returns titles with platform and date."""
        stmt = select(Submission).where(Submission.user_id == user_id)
        if topic:
            stmt = stmt.where(
                Submission.title.ilike(f"%{topic}%") | cast(Submission.topics, String).ilike(f"%{topic}%")
            )
        if difficulty:
            stmt = stmt.where(Submission.difficulty == difficulty.lower())
        rows = db.execute(stmt.order_by(Submission.solved_at.desc().nullslast()).limit(min(limit, 50))).scalars().all()
        if not rows:
            return "No solved problems matched those filters."
        return json.dumps([
            {"title": r.title, "platform": r.platform, "difficulty": r.difficulty,
             "topics": r.topics, "solved_at": r.solved_at.isoformat() if r.solved_at else None}
            for r in rows
        ])

    @tool
    def search_my_problems_tool(query: str, limit: int = 8) -> str:
        """Semantic search over the student's solved problems (RAG). Use for fuzzy questions like 'which DP problems have I solved'."""
        docs = search_my_problems(user_id, query, k=limit)
        if not docs:
            return "No indexed problems found. The student may not have synced yet."
        return json.dumps([{"content": d.page_content, **d.metadata} for d in docs])

    @tool
    def get_contest_history() -> str:
        """Get the student's contest participation and rating history across platforms."""
        rows = db.execute(
            select(ContestRecord).where(ContestRecord.user_id == user_id).order_by(ContestRecord.contest_date)
        ).scalars().all()
        if not rows:
            return "No contest records synced yet."
        return json.dumps([
            {"platform": r.platform, "contest": r.contest_name, "date": r.contest_date.isoformat() if r.contest_date else None,
             "rank": r.rank, "rating": r.new_rating}
            for r in rows
        ])

    @tool
    def get_upcoming_contests_tool() -> str:
        """Get upcoming contests from Codeforces, LeetCode, CodeChef, and AtCoder with dates, durations, and links."""
        return json.dumps(get_upcoming_contests(db))

    @tool
    def explain_topic(topic: str) -> str:
        """Retrieve the bundled study note for a DSA topic (pattern explanation + classic problems). Use before explaining any concept."""
        docs = search_knowledge(topic, k=2)
        if not docs:
            return f"No knowledge note found for '{topic}'."
        return "\n\n".join(f"[{d.metadata['topic']}]\n{d.page_content}" for d in docs)

    @tool
    def get_current_plan() -> str:
        """Get the student's current AI-generated study plan with task completion status."""
        plan = db.execute(
            select(Plan).where(Plan.user_id == user_id, Plan.status == "active").order_by(Plan.created_at.desc())
        ).scalars().first()
        if plan is None:
            return "No active plan. The student can generate one on the AI Plan page."
        return json.dumps({
            "title": plan.title, "goal": plan.goal, "hours_per_day": plan.hours_per_day,
            "target_date": plan.target_date.isoformat() if plan.target_date else None,
            "tasks": [
                {"id": t.id, "day": t.day_no, "topic": t.topic, "description": t.description,
                 "type": t.task_type, "done": t.done}
                for t in plan.tasks
            ],
        })

    @tool
    def plan_today_routine(available_hours: float = 3.0, focus_topic: str = "", wake_time: str = "07:30 AM") -> str:
        """Generate a time-blocked whole-day study routine for the student tailored to their available hours and topic focus."""
        if not user:
            return "User not found."
        try:
            routine = build_daily_routine(
                db,
                user,
                available_hours=available_hours,
                wake_time=wake_time,
                focus_topic=focus_topic,
            )
            return json.dumps(routine)
        except Exception as e:
            return f"Could not generate routine: {e}"

    @tool
    def mark_task_done(task_id: int) -> str:
        """Mark a study-plan task as done by its id. Confirm with the student before calling."""
        task = db.get(PlanTask, task_id)
        if task is None:
            return f"No task with id {task_id}."
        plan = db.get(Plan, task.plan_id)
        if plan is None or plan.user_id != user_id:
            return "That task does not belong to this student."
        task.done = True
        db.commit()
        return f"Task {task_id} marked done: {task.description[:80]}"

    return [
        get_my_stats,
        query_solved,
        search_my_problems_tool,
        get_contest_history,
        get_upcoming_contests_tool,
        explain_topic,
        get_current_plan,
        plan_today_routine,
        mark_task_done,
    ]
