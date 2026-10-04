from collections import Counter
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
        rating_resp.raise_for_status()
        rating_data = rating_resp.json()
        if rating_data.get("status") != "OK":
            raise platform_error("codeforces", rating_data.get("comment", "contest history request failed"))
        rating_changes = rating_data.get("result") or []

        # Fetch all history in bounded pages; a single 3000-row request silently
        # misses older solved problems for active users.
        subs = []
        offset = 1
        page_size = 1000
        while True:
            status_resp = client.get(
                f"{API}/user.status",
                params={"handle": handle, "from": offset, "count": page_size},
            )
            status_resp.raise_for_status()
            status_data = status_resp.json()
            if status_data.get("status") != "OK":
                raise platform_error("codeforces", status_data.get("comment", "submission history request failed"))
            page = status_data.get("result") or []
            subs.extend(page)
            if len(page) < page_size:
                break
            offset += len(page)

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
    topic_counter: Counter = Counter()

    for sub in subs:
        problem = sub.get("problem", {})
        if sub.get("verdict") != "OK":
            continue
        key = (problem.get("contestId"), problem.get("index"), problem.get("name"))
        if key in solved:
            continue
        ts = sub.get("creationTimeSeconds")
        tags = problem.get("tags", [])
        for tag in tags:
            topic_counter[tag.replace("-", " ").title()] += 1

        diff = _rating_bucket(problem.get("rating"))
        solved[key] = {
            "external_id": f"{problem.get('contestId', 'gym')}{problem.get('index', '')}-{problem.get('name', '')}",
            "title": problem.get("name", "Unknown"),
            "url": f"https://codeforces.com/problemset/problem/{problem.get('contestId')}/{problem.get('index')}"
            if problem.get("contestId")
            else "",
            "difficulty": diff,
            "topics": tags,
            "solved_at": datetime.fromtimestamp(ts, tz=timezone.utc) if ts else None,
        }

    easy_count = sum(1 for s in solved.values() if s["difficulty"] == "easy")
    medium_count = sum(1 for s in solved.values() if s["difficulty"] == "medium")
    hard_count = sum(1 for s in solved.values() if s["difficulty"] == "hard")

    topics_list = [
        {"name": name, "slug": name.lower().replace(" ", "-"), "solved": count}
        for name, count in topic_counter.most_common(15)
    ]

    stats = {
        "rating": info.get("rating"),
        "max_rating": info.get("maxRating"),
        "rank": info.get("rank"),
        "contribution": info.get("contribution"),
        "total_solved": len(solved),
        "easy": easy_count,
        "medium": medium_count,
        "hard": hard_count,
        "difficulty_method": "problem rating: <1200 easy, 1200-1699 medium, 1700+ hard",
        "difficulty_breakdown_available": True,
        "topics": topics_list,
    }
    return {"stats": stats, "submissions": list(solved.values()), "contests": contests}
