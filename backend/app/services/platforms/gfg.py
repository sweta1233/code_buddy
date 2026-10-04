import json
import re

import httpx
from bs4 import BeautifulSoup

from app.services.platforms.base import PlatformError, platform_error

PROFILE_URL = "https://www.geeksforgeeks.org/user/{handle}/"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CodeBuddy/0.1"}

_WANTED_KEYS = {
    "totalProblemsSolved": "total_solved",
    "overallCodingScore": "overall_score",
    "monthlyCodingScore": "monthly_score",
    "instituteRank": "institute_rank",
    "streakCount": "streak",
    "currentStreak": "streak",
}


def _find_user_info(node, diff_counts: dict) -> dict:
    """Walk the __NEXT_DATA__ JSON tree and collect any known stat keys and difficulty breakdowns."""
    found: dict = {}
    if isinstance(node, dict):
        for key, value in node.items():
            k_lower = key.lower()
            if k_lower in ("school", "basic", "easy", "medium", "hard") and isinstance(value, (int, float)):
                diff_counts[k_lower] = int(value)
            elif key in ("userSubmissionsInfo", "solvedStats") and isinstance(value, dict):
                for sub_k, sub_v in value.items():
                    sub_lower = sub_k.lower()
                    if isinstance(sub_v, dict) and "count" in sub_v:
                        diff_counts[sub_lower] = int(sub_v["count"])
                    elif isinstance(sub_v, (int, float)):
                        diff_counts[sub_lower] = int(sub_v)

            if key in _WANTED_KEYS and isinstance(value, (int, float)) and _WANTED_KEYS[key] not in found:
                found[_WANTED_KEYS[key]] = value
            else:
                found.update(_find_user_info(value, diff_counts))
    elif isinstance(node, list):
        for item in node:
            found.update(_find_user_info(item, diff_counts))
    return found


def fetch(handle: str) -> dict:
    url = PROFILE_URL.format(handle=handle)
    resp = httpx.get(url, headers=HEADERS, timeout=30, follow_redirects=True)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "lxml")
    next_data = soup.find("script", id="__NEXT_DATA__")
    if next_data is None:
        raise platform_error("gfg", "could not parse profile (site markup may have changed)")

    try:
        data = json.loads(next_data.string or "")
    except json.JSONDecodeError as exc:
        raise platform_error("gfg", f"failed to decode profile data: {exc}") from exc

    diff_counts: dict = {}
    stats = _find_user_info(data, diff_counts)

    # Calculate granular difficulty breakdown
    school = diff_counts.get("school", 0)
    basic = diff_counts.get("basic", 0)
    easy_raw = diff_counts.get("easy", 0)
    easy = school + basic + easy_raw
    medium = diff_counts.get("medium", 0)
    hard = diff_counts.get("hard", 0)

    total_from_diff = easy + medium + hard
    reported_total = stats.get("total_solved")
    if reported_total is None and "overall_score" not in stats and not total_from_diff:
        raise platform_error("gfg", f"user '{handle}' not found or profile is private")
    total_solved = reported_total if reported_total is not None else total_from_diff

    stats["total_solved"] = total_solved
    if total_from_diff:
        stats["easy"] = easy
        stats["medium"] = medium
        stats["hard"] = hard
        stats["difficulty_breakdown_available"] = True
    else:
        stats["difficulty_breakdown_available"] = False

    return {"stats": stats, "submissions": [], "contests": []}
