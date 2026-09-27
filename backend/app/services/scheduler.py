import logging

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import select

from app.db.base import SessionLocal
from app.models import PlatformAccount, User

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler(timezone="UTC")


def sync_all_users() -> None:
    """Background job: refresh every user's connected platforms."""
    from app.ai.insights import generate_weekly_insight
    from app.services.sync import sync_user

    db = SessionLocal()
    try:
        user_ids = db.execute(
            select(User.id).distinct().join(PlatformAccount, PlatformAccount.user_id == User.id)
        ).scalars().all()
        for user_id in user_ids:
            try:
                sync_user(db, user_id)
                generate_weekly_insight(db, user_id)
            except Exception:
                logger.exception("sync failed for user %s", user_id)
    finally:
        db.close()


def refresh_contest_cache() -> None:
    from app.services.contests import get_upcoming_contests

    db = SessionLocal()
    try:
        get_upcoming_contests(db)
    except Exception:
        logger.exception("contest cache refresh failed")
    finally:
        db.close()


def start_scheduler() -> None:
    if scheduler.get_jobs():
        return
    scheduler.add_job(sync_all_users, "interval", hours=6, id="sync_all_users", next_run_time=None)
    scheduler.add_job(refresh_contest_cache, "interval", minutes=60, id="refresh_contest_cache")
    scheduler.start()
    logger.info("scheduler started")
