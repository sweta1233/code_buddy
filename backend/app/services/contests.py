import logging
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

import httpx
from sqlalchemy.orm import Session

from app.models import ContestCache, utcnow

CACHE_TTL_SECONDS = 3600
EMPTY_CACHE_TTL_SECONDS = 300
logger = logging.getLogger(__name__)

LEETCODE_UPCOMING_QUERY = """
query {
  upcomingContests { title titleSlug startTime duration }
}
"""

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CodeBuddy/0.1"}
LC_HEADERS = {
    "Content-Type": "application/json",
    "Referer": "https://leetcode.com",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CodeBuddy/0.1",
}


def _make_gcal_url(title: str, start_dt: datetime, duration_minutes: int, url: str, platform: str) -> str:
    if start_dt.tzinfo is None:
        start_dt = start_dt.replace(tzinfo=timezone.utc)
    start_dt = start_dt.astimezone(timezone.utc)
    end_dt = start_dt + timedelta(minutes=duration_minutes)
    # Format: YYYYMMDDTHHMMSSZ
    fmt = "%Y%m%dT%H%M%SZ"
    start_str = start_dt.strftime(fmt)
    end_str = end_dt.strftime(fmt)
    details = f"Platform: {platform.title()}\nContest Link: {url}\n\nTracked via CodeBuddy"
    return (
        f"https://calendar.google.com/calendar/render?action=TEMPLATE"
        f"&text={quote(title)}"
        f"&dates={start_str}/{end_str}"
        f"&details={quote(details)}"
        f"&location={quote(platform.title())}"
    )


def _contest_start_utc(contest: dict) -> datetime:
    start_dt = datetime.fromisoformat(contest["start_time"])
    if start_dt.tzinfo is None:
        start_dt = start_dt.replace(tzinfo=timezone.utc)
    return start_dt.astimezone(timezone.utc)


def _fetch_codeforces() -> list[dict]:
    resp = httpx.get(
        "https://codeforces.com/api/contest.list", headers=HEADERS, timeout=30
    )
    resp.raise_for_status()
    data = resp.json()
    if data.get("status") != "OK":
        raise RuntimeError(data.get("comment", "Codeforces contest API returned an error"))
    upcoming = [c for c in data["result"] if c.get("phase") == "BEFORE"]
    results = []
    for c in upcoming[:15]:
        start_dt = datetime.fromtimestamp(c["startTimeSeconds"], tz=timezone.utc)
        dur = c.get("durationSeconds", 0) // 60
        url = f"https://codeforces.com/contests/{c['id']}"
        name = c["name"]
        results.append({
            "id": f"cf-{c['id']}",
            "platform": "codeforces",
            "name": name,
            "start_time": start_dt.isoformat(),
            "duration_minutes": dur,
            "url": url,
            "gcal_url": _make_gcal_url(name, start_dt, dur, url, "codeforces"),
        })
    return results


def _fetch_leetcode() -> list[dict]:
    resp = httpx.post(
        "https://leetcode.com/graphql",
        json={"query": LEETCODE_UPCOMING_QUERY},
        headers=LC_HEADERS,
        timeout=30,
    )
    resp.raise_for_status()
    payload = resp.json()
    if payload.get("errors"):
        raise RuntimeError(payload["errors"][0].get("message", "LeetCode contest API returned an error"))
    contests = payload.get("data", {}).get("upcomingContests")
    if contests is None:
        raise RuntimeError("LeetCode did not return its upcoming contest list")
    results = []
    for c in contests:
        start_dt = datetime.fromtimestamp(c["startTime"], tz=timezone.utc)
        dur = c.get("duration", 0) // 60
        url = f"https://leetcode.com/contest/{c['titleSlug']}"
        name = c["title"]
        results.append({
            "id": f"lc-{c['titleSlug']}",
            "platform": "leetcode",
            "name": name,
            "start_time": start_dt.isoformat(),
            "duration_minutes": dur,
            "url": url,
            "gcal_url": _make_gcal_url(name, start_dt, dur, url, "leetcode"),
        })
    return results


def _fetch_codechef() -> list[dict]:
    resp = httpx.get(
        "https://www.codechef.com/api/list/contests/all?sort_by=START&sorting_order=asc&offset=0&mode=premium",
        headers=HEADERS,
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    if "future_contests" not in data:
        raise RuntimeError("CodeChef did not return its future contest list")
    future = data.get("future_contests", [])
    results = []
    for c in future[:10]:
        start_str = c.get("contest_start_date_iso")
        if not start_str:
            continue
        start_dt = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
        dur = int(c.get("contest_duration", 0))
        code = c.get("contest_code", "")
        url = f"https://www.codechef.com/{code}"
        name = c.get("contest_name", f"CodeChef {code}")
        results.append({
            "id": f"cc-{code}",
            "platform": "codechef",
            "name": name,
            "start_time": start_dt.isoformat(),
            "duration_minutes": dur,
            "url": url,
            "gcal_url": _make_gcal_url(name, start_dt, dur, url, "codechef"),
        })
    return results


def _fetch_atcoder() -> list[dict]:
    resp = httpx.get(
        "https://kenkoooo.com/atcoder/resources/contests.json",
        headers=HEADERS,
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    if not isinstance(data, list):
        raise RuntimeError("AtCoder contest source returned an invalid list")
    now_ts = datetime.now(tz=timezone.utc).timestamp()
    upcoming = [c for c in data if c.get("start_epoch_second", 0) > now_ts]
    upcoming.sort(key=lambda x: x.get("start_epoch_second", 0))
    results = []
    for c in upcoming[:10]:
        start_dt = datetime.fromtimestamp(c["start_epoch_second"], tz=timezone.utc)
        dur = c.get("duration_second", 0) // 60
        cid = c.get("id", "")
        url = f"https://atcoder.jp/contests/{cid}"
        name = c.get("title", f"AtCoder {cid}")
        results.append({
            "id": f"ac-{cid}",
            "platform": "atcoder",
            "name": name,
            "start_time": start_dt.isoformat(),
            "duration_minutes": dur,
            "url": url,
            "gcal_url": _make_gcal_url(name, start_dt, dur, url, "atcoder"),
        })
    return results


def get_upcoming_contests_result(db: Session, force_refresh: bool = False) -> dict:
    cached = db.query(ContestCache).all()
    now = utcnow()
    now_utc = datetime.now(tz=timezone.utc)
    cached_by_platform = {row.platform: row for row in cached}
    fresh = {}
    for row in cached:
        fetched_at = row.fetched_at
        if fetched_at.tzinfo is None:
            fetched_at = fetched_at.replace(tzinfo=timezone.utc)
        ttl = CACHE_TTL_SECONDS if row.data else EMPTY_CACHE_TTL_SECONDS
        if not force_refresh and (now - fetched_at).total_seconds() < ttl:
            fresh[row.platform] = row

    results: list[dict] = []
    for row in fresh.values():
        results.extend(c for c in (row.data or []) if _contest_start_utc(c) > now_utc)

    all_platforms = {"codeforces", "leetcode", "codechef", "atcoder"}
    platforms_missing = all_platforms - set(fresh)
    unavailable = []

    fetchers = {
        "codeforces": _fetch_codeforces,
        "leetcode": _fetch_leetcode,
        "codechef": _fetch_codechef,
        "atcoder": _fetch_atcoder,
    }
    for platform in platforms_missing:
        try:
            data = fetchers[platform]()
        except Exception as exc:
            logger.warning("Could not refresh %s contest schedule: %s", platform, exc)
            unavailable.append(platform)
            stale_row = cached_by_platform.get(platform)
            if stale_row:
                results.extend(
                    c for c in (stale_row.data or [])
                    if _contest_start_utc(c) > now_utc
                )
            continue

        row = cached_by_platform.get(platform)
        if row is None:
            row = ContestCache(platform=platform)
            db.add(row)
            cached_by_platform[platform] = row
        row.data = data
        row.fetched_at = utcnow()
        results.extend(data)
    db.commit()
    return {
        "contests": sorted(results, key=_contest_start_utc),
        "unavailable": sorted(unavailable),
    }


def get_upcoming_contests(db: Session) -> list[dict]:
    return get_upcoming_contests_result(db)["contests"]


def build_ics_calendar(contests: list[dict]) -> str:
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//CodeBuddy//Contest Calendar//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:CodeBuddy Coding Contests",
        "X-WR-TIMEZONE:UTC",
    ]

    fmt = "%Y%m%dT%H%M%SZ"
    now_str = datetime.now(tz=timezone.utc).strftime(fmt)

    for c in contests:
        try:
            start_dt = datetime.fromisoformat(c["start_time"])
            if start_dt.tzinfo is None:
                start_dt = start_dt.replace(tzinfo=timezone.utc)
            start_dt = start_dt.astimezone(timezone.utc)
            end_dt = start_dt + timedelta(minutes=c["duration_minutes"])
            uid = f"{c.get('id', c['name'])}-codebuddy@app"
            lines.extend([
                "BEGIN:VEVENT",
                f"UID:{uid}",
                f"DTSTAMP:{now_str}",
                f"DTSTART:{start_dt.strftime(fmt)}",
                f"DTEND:{end_dt.strftime(fmt)}",
                f"SUMMARY:{c['name']} ({c['platform'].title()})",
                f"DESCRIPTION:Contest on {c['platform'].title()}\\nLink: {c['url']}",
                f"URL:{c['url']}",
                f"LOCATION:{c['platform'].title()}",
                "STATUS:CONFIRMED",
                "END:VEVENT",
            ])
        except Exception:
            continue

    lines.append("END:VCALENDAR")
    return "\r\n".join(lines)
