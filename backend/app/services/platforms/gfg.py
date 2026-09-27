import json

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
}


def _find_user_info(node) -> dict:
    """Walk the __NEXT_DATA__ JSON tree and collect any known stat keys wherever they sit."""
    found: dict = {}
    if isinstance(node, dict):
        for key, value in node.items():
            if key in _WANTED_KEYS and isinstance(value, (int, float)) and key not in found:
                found[_WANTED_KEYS[key]] = value
            else:
                found.update(_find_user_info(value))
    elif isinstance(node, list):
        for item in node:
            found.update(_find_user_info(item))
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

    stats = _find_user_info(data)
    if "total_solved" not in stats:
        raise platform_error("gfg", f"user '{handle}' not found or profile is private")
    return {"stats": stats, "submissions": [], "contests": []}
