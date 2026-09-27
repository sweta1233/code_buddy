from datetime import datetime, timezone

import httpx
from sqlalchemy.orm import Session

from app.models import ContestCache, utcnow

CACHE_TTL_SECONDS = 3600

LEETCODE_UPCOMING_QUERY = """
query {
  upcomingContests { title titleSlug startTime duration }
}
"""

CF_HEADERS = {"User-Agent": "Mozilla/5.0 CodeBuddy/0.1"}
LC_HEADERS = {
    "Content-Type": "application/json",
    "Referer": "https://leetcode.com",
    "User-Agent": "Mozilla/5.0 CodeBuddy/0.1",
}


def _fetch_codeforces() -> list[dict]:
    resp = httpx.get(
        "https://codeforces.com/api/contest.list", headers=CF_HEADERS, timeout=30
    )
    resp.raise_for_status()
    data = resp.json()
    if data.get("status") != "OK":
        return []
    upcoming = [c for c in data["result"] if c.get("phase") == "BEFORE"]
    return [
        {
            "platform": "codeforces",
            "name": c["name"],
            "start_time": datetime.fromtimestamp(c["startTimeSeconds"], tz=timezone.utc).isoformat(),
            "duration_minutes": c.get("durationSeconds", 0) // 60,
            "url": f"https://codeforces.com/contests/{c['id']}",
        }
        for c in upcoming[:15]
    ]


def _fetch_leetcode() -> list[dict]:
    resp = httpx.post(
        "https://leetcode.com/graphql",
        json={"query": LEETCODE_UPCOMING_QUERY},
        headers=LC_HEADERS,
        timeout=30,
    )
    resp.raise_for_status()
    contests = resp.json().get("data", {}).get("upcomingContests") or []
    return [
        {
            "platform": "leetcode",
            "name": c["title"],
            "start_time": datetime.fromtimestamp(c["startTime"], tz=timezone.utc).isoformat(),
            "duration_minutes": c.get("duration", 0) // 60,
            "url": f"https://leetcode.com/contest/{c['titleSlug']}",
        }
        for c in contests
    ]


def get_upcoming_contests(db: Session) -> list[dict]:
    cached = db.query(ContestCache).all()
    now = utcnow()
    fresh = {
        row.platform: row
        for row in cached
        if (now - row.fetched_at).total_seconds() < CACHE_TTL_SECONDS
    }

    results: list[dict] = []
    for row in cached:
        if row.platform not in fresh:
            continue
        results.extend(row.data)

    platforms_missing = {"codeforces", "leetcode"} - set(fresh)
    if not platforms_missing:
        return sorted(results, key=lambda c: c["start_time"])

    fetchers = {"codeforces": _fetch_codeforces, "leetcode": _fetch_leetcode}
    for platform in platforms_missing:
        try:
            data = fetchers[platform]()
        except httpx.HTTPError:
            data = []
        row = next((r for r in cached if r.platform == platform), None)
        if row is None:
            row = ContestCache(platform=platform)
            db.add(row)
        row.data = data
        row.fetched_at = utcnow()
        results.extend(data)
    db.commit()
    return sorted(results, key=lambda c: c["start_time"])
