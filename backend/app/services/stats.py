from collections import Counter
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import ContestRecord, Insight, PlatformAccount, Snapshot, Submission, utcnow


def _latest_snapshots(db: Session, user_id: int) -> dict[str, Snapshot]:
    """Most recent snapshot per platform."""
    latest: dict[str, Snapshot] = {}
    rows = db.execute(
        select(Snapshot).where(Snapshot.user_id == user_id).order_by(Snapshot.captured_at)
    ).scalars().all()
    for row in rows:
        latest[row.platform] = row
    return latest


def overview(db: Session, user_id: int) -> dict:
    accounts = db.execute(
        select(PlatformAccount).where(PlatformAccount.user_id == user_id)
    ).scalars().all()
    snapshots = _latest_snapshots(db, user_id)

    platform_cards = []
    totals = {"solved": 0, "easy": 0, "medium": 0, "hard": 0, "rating": None}
    topic_counter: Counter = Counter()

    for account in accounts:
        snap = snapshots.get(account.platform)
        stats = snap.stats if snap else {}
        platform_cards.append({
            "platform": account.platform,
            "handle": account.handle,
            "status": account.last_status,
            "last_synced_at": account.last_synced_at.isoformat() if account.last_synced_at else None,
            "stats": stats,
        })
        totals["solved"] += stats.get("total_solved", 0) or 0
        totals["easy"] += stats.get("easy", 0) or 0
        totals["medium"] += stats.get("medium", 0) or 0
        totals["hard"] += stats.get("hard", 0) or 0
        rating = stats.get("rating")
        if rating and (totals["rating"] is None or rating > totals["rating"]):
            totals["rating"] = rating
        for topic in stats.get("topics") or []:
            topic_counter[topic["name"]] += topic.get("solved", 0)

    # Difficulty split also picks up Codeforces rows when LeetCode is not connected.
    if totals["easy"] + totals["medium"] + totals["hard"] == 0:
        rows = db.execute(
            select(Submission.difficulty, func.count()).where(Submission.user_id == user_id).group_by(Submission.difficulty)
        ).all()
        counts = {diff: n for diff, n in rows}
        totals["easy"] = counts.get("easy", 0)
        totals["medium"] = counts.get("medium", 0)
        totals["hard"] = counts.get("hard", 0)

    heatmap = build_heatmap(db, user_id)
    totals["active_days"] = len(heatmap)
    totals["streak"] = compute_streak(heatmap)

    recent = db.execute(
        select(Submission).where(Submission.user_id == user_id)
        .order_by(Submission.solved_at.desc().nullslast()).limit(15)
    ).scalars().all()

    latest_insight = db.execute(
        select(Insight).where(Insight.user_id == user_id).order_by(Insight.created_at.desc()).limit(1)
    ).scalars().first()

    return {
        "totals": totals,
        "platforms": platform_cards,
        "topics": [{"name": name, "solved": count} for name, count in topic_counter.most_common(12)],
        "recent": [
            {
                "platform": s.platform,
                "title": s.title,
                "url": s.url,
                "difficulty": s.difficulty,
                "solved_at": s.solved_at.isoformat() if s.solved_at else None,
            }
            for s in recent
        ],
        "insight": latest_insight.content if latest_insight else None,
    }


def build_heatmap(db: Session, user_id: int) -> dict[str, int]:
    since = date.today() - timedelta(days=365)
    rows = db.execute(
        select(Submission.solved_at).where(
            Submission.user_id == user_id, Submission.solved_at >= since
        )
    ).scalars().all()
    counts: Counter = Counter()
    for dt in rows:
        if dt is not None:
            counts[dt.date().isoformat()] += 1
    return counts


def compute_streak(heatmap: dict[str, int]) -> int:
    streak = 0
    day = date.today()
    if heatmap.get(day.isoformat(), 0) == 0:
        day -= timedelta(days=1)  # streak may end yesterday and still count
    while heatmap.get(day.isoformat(), 0) > 0:
        streak += 1
        day -= timedelta(days=1)
    return streak


def rating_series(db: Session, user_id: int) -> dict[str, list]:
    series: dict[str, list] = {}
    rows = db.execute(
        select(ContestRecord).where(ContestRecord.user_id == user_id).order_by(ContestRecord.contest_date)
    ).scalars().all()
    for row in rows:
        if row.new_rating is None:
            continue
        series.setdefault(row.platform, []).append({
            "date": row.contest_date.isoformat() if row.contest_date else None,
            "rating": row.new_rating,
            "name": row.contest_name,
        })
    return series


def topic_analysis(db: Session, user_id: int) -> dict:
    """Solved counts per topic across platforms — feeds weak/strong detection for the AI planner."""
    topic_counter: Counter = Counter()
    snapshots = _latest_snapshots(db, user_id)
    for snap in snapshots.values():
        for topic in snap.stats.get("topics") or []:
            topic_counter[topic["name"]] += topic.get("solved", 0)
    cf_rows = db.execute(
        select(Submission.topics).where(Submission.user_id == user_id, Submission.platform == "codeforces")
    ).scalars().all()
    for topics in cf_rows:
        for tag in topics or []:
            topic_counter[tag.replace("-", " ").title()] += 1
    return dict(topic_counter)
