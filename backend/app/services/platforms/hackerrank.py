from datetime import datetime, timezone
import httpx

from app.services.platforms.base import PlatformError, platform_error

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CodeBuddy/0.1",
    "Accept": "application/json",
}


def fetch(handle: str) -> dict:
    profile_url = f"https://www.hackerrank.com/rest/hackers/{handle}/profile"
    badges_url = f"https://www.hackerrank.com/rest/hackers/{handle}/badges"
    scores_url = f"https://www.hackerrank.com/rest/hackers/{handle}/scores_elo"

    with httpx.Client(timeout=30, headers=HEADERS, follow_redirects=True) as client:
        resp = client.get(profile_url)
        if resp.status_code == 404:
            raise platform_error("hackerrank", f"user '{handle}' not found")
        resp.raise_for_status()
        data = resp.json()

        model = data.get("model", {})
        if not model:
            raise platform_error("hackerrank", f"user '{handle}' not found")

        # Badges & solved counts
        badges_resp = client.get(badges_url)
        badges_list = []
        solved_total = 0
        if badges_resp.status_code == 200:
            badges_data = badges_resp.json().get("models", [])
            for b in badges_data:
                solved = b.get("solved", 0)
                solved_total += solved
                badges_list.append({
                    "badge_name": b.get("badge_name"),
                    "stars": b.get("stars", 0),
                    "solved": solved,
                    "total_challenges": b.get("total_challenges", 0),
                })

        # Rating / scores
        scores_resp = client.get(scores_url)
        contest_rating = None
        if scores_resp.status_code == 200:
            scores_data = scores_resp.json().get("models", [])
            for s in scores_data:
                if s.get("practice") is False and "rating" in s:
                    contest_rating = s.get("rating")
                    break

    stats = {
        "username": model.get("username"),
        "name": model.get("name"),
        "country": model.get("country"),
        "total_solved": solved_total,
        "difficulty_breakdown_available": False,
        "rating": contest_rating,
        "badges": badges_list,
        "created_at": model.get("created_at"),
    }

    return {"stats": stats, "submissions": [], "contests": []}
