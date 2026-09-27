from datetime import date, datetime, timezone

import httpx

from app.services.platforms.base import PlatformError, platform_error

GRAPHQL_URL = "https://leetcode.com/graphql"
HEADERS = {
    "Content-Type": "application/json",
    "Referer": "https://leetcode.com",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CodeBuddy/0.1",
}

PROFILE_QUERY = """
query userProfile($username: String!) {
  matchedUser(username: $username) {
    username
    profile { ranking }
    submitStatsGlobal { acSubmissionNum { difficulty count } }
    tagProblemCounts {
      fundamental { tagName tagSlug problemsSolved }
      intermediate { tagName tagSlug problemsSolved }
      advanced { tagName tagSlug problemsSolved }
    }
  }
}
"""

RECENT_AC_QUERY = """
query recentAcSubmissions($username: String!) {
  recentAcSubmissionList(username: $username, limit: 100) {
    title
    titleSlug
    timestamp
  }
}
"""

CONTEST_QUERY = """
query contestHistory($username: String!) {
  userContestRankingHistory(username: $username) {
    attended
    problemsSolved
    rating
    ranking
    contest { title startTime }
  }
}
"""


def _gql(client: httpx.Client, query: str, variables: dict) -> dict:
    resp = client.post(GRAPHQL_URL, json={"query": query, "variables": variables}, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    if data.get("errors"):
        raise platform_error("leetcode", data["errors"][0].get("message", "GraphQL error"))
    return data.get("data") or {}


def _ts_to_datetime(ts: int) -> datetime:
    return datetime.fromtimestamp(ts, tz=timezone.utc)


def _ts_to_date(ts: int) -> date:
    return _ts_to_datetime(ts).date()


def fetch(handle: str) -> dict:
    with httpx.Client() as client:
        profile = _gql(client, PROFILE_QUERY, {"username": handle}).get("matchedUser")
        if profile is None:
            raise platform_error("leetcode", f"user '{handle}' not found")

        ac = profile["submitStatsGlobal"]["acSubmissionNum"]
        counts = {row["difficulty"].lower(): row["count"] for row in ac}
        topic_lists = profile.get("tagProblemCounts") or {}
        topics = []
        for group in ("fundamental", "intermediate", "advanced"):
            for t in topic_lists.get(group) or []:
                topics.append({"name": t["tagName"], "slug": t["tagSlug"], "solved": t["problemsSolved"]})

        recent = _gql(client, RECENT_AC_QUERY, {"username": handle}).get("recentAcSubmissionList") or []
        submissions = [
            {
                "external_id": row["titleSlug"],
                "title": row["title"],
                "url": f"https://leetcode.com/problems/{row['titleSlug']}/",
                "difficulty": "",
                "topics": [],
                "solved_at": _ts_to_datetime(int(row["timestamp"])),
            }
            for row in recent
        ]

        history = _gql(client, CONTEST_QUERY, {"username": handle}).get("userContestRankingHistory") or []
        contests = []
        prev_rating = None
        for row in history:
            if not row.get("attended"):
                continue
            contests.append({
                "contest_name": row["contest"]["title"],
                "contest_date": _ts_to_date(int(row["contest"]["startTime"])),
                "rank": row.get("ranking"),
                "old_rating": prev_rating,
                "new_rating": row.get("rating"),
                "problems_solved": row.get("problemsSolved"),
            })
            prev_rating = row.get("rating")

    stats = {
        "total_solved": counts.get("all", 0),
        "easy": counts.get("easy", 0),
        "medium": counts.get("medium", 0),
        "hard": counts.get("hard", 0),
        "ranking": profile["profile"].get("ranking"),
        "rating": contests[-1]["new_rating"] if contests else None,
        "topics": topics,
    }
    return {"stats": stats, "submissions": submissions, "contests": contests}
