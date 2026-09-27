import re
from datetime import datetime, timezone

import httpx
from bs4 import BeautifulSoup

from app.services.platforms.base import PlatformError, platform_error

PROFILE_URL = "https://www.codechef.com/users/{handle}"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CodeBuddy/0.1"}


def _first_int(html: str, pattern: str) -> int | None:
    match = re.search(pattern, html)
    return int(match.group(1)) if match else None


def fetch(handle: str) -> dict:
    url = PROFILE_URL.format(handle=handle)
    resp = httpx.get(url, headers=HEADERS, timeout=30, follow_redirects=True)
    resp.raise_for_status()
    html = resp.text

    if "page not found" in html.lower() or resp.status_code != 200:
        raise platform_error("codechef", f"profile '{handle}' not found or unreachable")

    soup = BeautifulSoup(html, "lxml")

    rating_el = soup.select_one(".rating-number")
    stars_el = soup.select_one(".rating-stars")
    highest_el = soup.select_one(".rating-header .rating-number + small")

    fully_solved = _first_int(html, r"Fully Solved\s*[:\-]?\s*(\d+)")
    partially_solved = _first_int(html, r"Partially Solved\s*[:\-]?\s*(\d+)")

    if rating_el is None and fully_solved is None:
        raise platform_error("codechef", "could not parse profile (site markup may have changed)")

    try:
        rating = int(rating_el.text.strip()) if rating_el else None
    except ValueError:
        rating = None

    contests = []
    for row in soup.select(".rating-table .rating-row, .datatable tr"):
        cells = [c.get_text(strip=True) for c in row.find_all(["td", "span"], recursive=True)]
        if len(cells) >= 5 and re.match(r"^\d{2} \w{3} \d{4}$", cells[1] or ""):
            try:
                contest_date = datetime.strptime(cells[1], "%d %b %Y").date()
            except ValueError:
                continue
            try:
                new_rating = float(cells[2])
            except (ValueError, IndexError):
                new_rating = None
            contests.append({
                "contest_name": cells[0],
                "contest_date": contest_date,
                "rank": int(cells[3]) if cells[3].isdigit() else None,
                "old_rating": None,
                "new_rating": new_rating,
                "problems_solved": None,
            })

    stars = stars_el.get_text(strip=True).count("★") if stars_el else None
    stats = {
        "rating": rating,
        "stars": stars,
        "highest_rating": int(highest_el.text.strip()) if highest_el and highest_el.text.strip().isdigit() else rating,
        "fully_solved": fully_solved,
        "partially_solved": partially_solved,
        "total_solved": fully_solved or 0,
        "last_activity": datetime.now(tz=timezone.utc).isoformat(),
    }
    return {"stats": stats, "submissions": [], "contests": contests}
