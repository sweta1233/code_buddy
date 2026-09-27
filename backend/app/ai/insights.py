"""Weekly AI insight: compares this week's snapshot to the previous one and writes a short summary."""

from datetime import timedelta

from langchain_core.messages import HumanMessage, SystemMessage
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.llm import get_llm
from app.ai.prompts import insight_system
from app.models import Insight, Snapshot, utcnow


def generate_weekly_insight(db: Session, user_id: int, force: bool = False) -> Insight | None:
    latest = db.execute(
        select(Insight).where(Insight.user_id == user_id).order_by(Insight.created_at.desc()).limit(1)
    ).scalars().first()
    if latest and not force and (utcnow() - latest.created_at).total_seconds() < 20 * 3600:
        return None

    rows = db.execute(
        select(Snapshot).where(Snapshot.user_id == user_id).order_by(Snapshot.captured_at)
    ).scalars().all()
    if not rows:
        return None

    week_ago = utcnow() - timedelta(days=7)
    report_lines = []
    for platform in {r.platform for r in rows}:
        platform_rows = [r for r in rows if r.platform == platform]
        current = platform_rows[-1]
        previous = next((r for r in platform_rows if r.captured_at <= week_ago), None)
        solved_now = current.stats.get("total_solved", 0)
        if previous is None:
            report_lines.append(f"{platform}: {solved_now} solved (first sync — no history yet).")
        else:
            delta = solved_now - previous.stats.get("total_solved", 0)
            report_lines.append(f"{platform}: {solved_now} solved (+{delta} this week).")

    llm_content = "\n".join(report_lines) + (
        "\nWeak/focus suggestion: mention the least-practiced topic if visible in recent activity."
    )
    llm = get_llm(0.5)
    result = llm.invoke([SystemMessage(content=insight_system()), HumanMessage(content=llm_content)])

    insight = Insight(user_id=user_id, content=result.content)
    db.add(insight)
    db.commit()
    db.refresh(insight)
    return insight
