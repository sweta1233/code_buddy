from datetime import datetime, timezone
import httpx

from app.services.platforms.base import PlatformError, platform_error

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CodeBuddy/0.1",
    "Accept": "application/json",
}


def fetch(handle: str) -> dict:
    info_url = f"https://kenkoooo.com/atcoder/atcoder-api/v3/user/info?user={handle}"
    history_url = f"https://atcoder.jp/users/{handle}/history/json"

    with httpx.Client(timeout=30, headers=HEADERS, follow_redirects=True) as client:
        info_resp = client.get(info_url)
        if info_resp.status_code == 404:
            raise platform_error("atcoder", f"user '{handle}' not found")
        info_resp.raise_for_status()
        info_data = info_resp.json()
        if not info_data or not info_data.get("user_id"):
            raise platform_error("atcoder", f"user '{handle}' not found")

        # Contest history
        contests = []
        latest_rating = None
        highest_rating = None
        try:
            hist_resp = client.get(history_url)
            if hist_resp.status_code == 200:
                hist_data = hist_resp.json()
                for h in hist_data:
                    if not h.get("IsRated", True):
                        continue
                    dt_str = h.get("EndTime", "")
                    try:
                        contest_date = datetime.fromisoformat(dt_str.replace("Z", "+00:00")).date()
                    except ValueError:
                        contest_date = None
                    new_r = h.get("NewRating")
                    old_r = h.get("OldRating")
                    if highest_rating is None or (new_r and new_r > highest_rating):
                        highest_rating = new_r
                    latest_rating = new_r

                    contests.append({
                        "contest_name": h.get("ContestScreenName", "AtCoder Contest"),
                        "contest_date": contest_date,
                        "rank": h.get("Place"),
                        "old_rating": old_r,
                        "new_rating": new_r,
                        "problems_solved": None,
                    })
        except Exception:
            pass

    accepted_count = info_data.get("accepted_count", 0)
    rated_point_sum = info_data.get("rated_point_sum", 0)

    stats = {
        "user_id": info_data.get("user_id"),
        "total_solved": accepted_count,
        "difficulty_breakdown_available": False,
        "rated_point_sum": rated_point_sum,
        "rating": latest_rating,
        "highest_rating": highest_rating,
    }

    return {"stats": stats, "submissions": [], "contests": contests}
