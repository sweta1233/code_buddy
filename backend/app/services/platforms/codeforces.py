from datetime import datetime, timezone

import httpx

from app.services.platforms.base import PlatformError, platform_error

API = "https://codeforces.com/api"


def _rating_bucket(problem_rating: int | None) -> str:
    if problem_rating is None:
        return ""
    if problem_rating < 1200:
        return "easy"
    if problem_rating < 1700:
        return "medium"
    return "hard"


def fetch(handle: str) -> dict:
    with httpx.Client(timeout=30) as client:
        info_resp = client.get(f"{API}/user.info", params={"handles": handle})
        info_resp.raise_for_status()
        info_data = info_resp.json()
        if info_data.get("status") != "OK":
            raise platform_error("codeforces", "API request failed")
        if not info_data.get("result"):
            raise platform_error("codeforces", f"user '{handle}' not found")
        info = info_data["result"][0]

        rating_changes = []
        rating_resp = client.get(f"{API}/user.rating", params={"handle": handle})
        if rating_resp.status_code == 200:
            rating_data = rating_resp.json()
            if rating_data.get("status") == "OK":
                rating_changes = rating_data.get("result") or []

        subs = []
        status_resp = client.get(f"{API}/user.status", params={"handle": handle, "from": "1", "count": "3000"})
        if status_resp.status_code == 200:
            status_data = status_resp.json()
            if status_data.get("status") == "OK":
                subs = status_data.get("result") or []

    contests = []
    for change in rating_changes:
        contests.append({
            "contest_name": change.get("contestName", "Codeforces contest"),
            "contest_date": datetime.fromtimestamp(change["ratingUpdateTimeSeconds"], tz=timezone.utc).date(),
            "rank": change.get("rank"),
            "old_rating": change.get("oldRating"),
            "new_rating": change.get("newRating"),
            "problems_solved": None,
        })

    solved: dict[tuple, dict] = {}
    for sub in subs:
        problem = sub.get("problem", {})
        if sub.get("verdict") != "OK":
            continue
        key = (problem.get("contestId"), problem.get("index"), problem.get("name"))
        if key in solved:
            continue
        ts = sub.get("creationTimeSeconds")
        solved[key] = {
            "external_id": f"{problem.get('contestId', 'gym')}{problem.get('index', '')}-{problem.get('name', '')}",
            "title": problem.get("name", "Unknown"),
            "url": f"https://codeforces.com/problemset/problem/{problem.get('contestId')}/{problem.get('index')}"
            if problem.get("contestId")
            else "",
            "difficulty": _rating_bucket(problem.get("rating")),
            "topics": problem.get("tags", []),
            "solved_at": datetime.fromtimestamp(ts, tz=timezone.utc) if ts else None,
        }

    stats = {
        "rating": info.get("rating"),
        "max_rating": info.get("maxRating"),
        "rank": info.get("rank"),
        "contribution": info.get("contribution"),
        "total_solved": len(solved),
    }
    return {"stats": stats, "submissions": list(solved.values()), "contests": contests}
