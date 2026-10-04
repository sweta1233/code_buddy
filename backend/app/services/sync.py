from datetime import datetime, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ContestRecord, PlatformAccount, Snapshot, Submission, utcnow
from app.services.platforms import PlatformError, get_adapter
from app.services.platforms.base import normalize_handle


def sync_account(db: Session, account: PlatformAccount) -> PlatformAccount:
    adapter = get_adapter(account.platform)
    try:
        account.handle = normalize_handle(account.platform, account.handle)
        data = adapter.fetch(account.handle)
    except (PlatformError, httpx.HTTPError) as exc:
        account.last_status = "error"
        account.last_error = str(exc)[:500]
        db.commit()
        return account

    existing_ids = set(
        db.execute(
            select(Submission.external_id).where(
                Submission.user_id == account.user_id, Submission.platform == account.platform
            )
        ).scalars()
    )
    for sub in data["submissions"]:
        if sub["external_id"] in existing_ids:
            continue
        db.add(Submission(
            user_id=account.user_id,
            platform=account.platform,
            external_id=sub["external_id"],
            title=sub["title"],
            url=sub.get("url", ""),
            difficulty=sub.get("difficulty", ""),
            topics=sub.get("topics", []),
            solved_at=sub.get("solved_at"),
        ))

    db.query(ContestRecord).filter(
        ContestRecord.user_id == account.user_id, ContestRecord.platform == account.platform
    ).delete()
    for contest in data["contests"]:
        db.add(ContestRecord(
            user_id=account.user_id,
            platform=account.platform,
            contest_name=contest["contest_name"],
            contest_date=contest.get("contest_date"),
            rank=contest.get("rank"),
            old_rating=contest.get("old_rating"),
            new_rating=contest.get("new_rating"),
            problems_solved=contest.get("problems_solved"),
        ))

    db.add(Snapshot(
        user_id=account.user_id,
        platform=account.platform,
        stats=data["stats"],
        captured_at=utcnow(),
    ))

    account.last_status = "ok"
    account.last_error = ""
    account.last_synced_at = datetime.now(tz=timezone.utc)
    db.commit()
    return account


def sync_user(db: Session, user_id: int) -> list[PlatformAccount]:
    accounts = db.execute(
        select(PlatformAccount).where(PlatformAccount.user_id == user_id)
    ).scalars().all()
    results = [sync_account(db, account) for account in accounts]

    # RAG re-index after new data lands; import here to avoid a circular import at module load.
    try:
        from app.ai.rag import index_user_submissions

        index_user_submissions(db, user_id)
    except Exception as exc:
        import logging

        logging.getLogger(__name__).warning("RAG indexing skipped for user %s: %s", user_id, exc)
    return results
