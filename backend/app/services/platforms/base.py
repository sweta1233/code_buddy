from urllib.parse import unquote, urlsplit


class PlatformError(Exception):
    """Raised when a platform adapter cannot fetch or parse a profile."""


# Every adapter returns this normalized shape:
# {"stats": {...}, "submissions": [{external_id, title, url, difficulty, topics, solved_at}], "contests": [...]}
def platform_error(platform: str, message: str) -> PlatformError:
    return PlatformError(f"{platform}: {message}")


_PROFILE_URLS = {
    "leetcode": ({"leetcode.com", "www.leetcode.com", "leetcode.cn"}, {"u", "profile"}),
    "codeforces": ({"codeforces.com", "www.codeforces.com"}, {"profile"}),
    "codechef": ({"codechef.com", "www.codechef.com"}, {"users"}),
    "gfg": ({"geeksforgeeks.org", "www.geeksforgeeks.org"}, {"user"}),
    "hackerrank": ({"hackerrank.com", "www.hackerrank.com"}, {"profile"}),
    "atcoder": ({"atcoder.jp", "www.atcoder.jp"}, {"users"}),
}


def normalize_handle(platform: str, value: str) -> str:
    """Accept a site's username or public profile URL and return just its username."""
    handle = value.strip()
    if not handle:
        raise platform_error(platform, "enter a username or profile URL")
    if handle.startswith("@"):
        handle = handle[1:].strip()

    # Treat URL-like values as URLs, including URLs pasted without a scheme.
    looks_like_url = "://" in handle or handle.startswith("www.")
    candidate = urlsplit(handle if "://" in handle else f"//{handle}")
    host = (candidate.hostname or "").lower()
    allowed_hosts, profile_paths = _PROFILE_URLS.get(platform, (set(), set()))
    looks_like_url = looks_like_url or host in set().union(*(hosts for hosts, _ in _PROFILE_URLS.values()))

    if looks_like_url:
        if host not in allowed_hosts:
            raise platform_error(platform, f"profile URL must belong to {platform}")
        parts = [unquote(part) for part in candidate.path.split("/") if part]
        if parts and parts[0].lower() in profile_paths:
            parts = parts[1:]
        if len(parts) != 1:
            raise platform_error(platform, "profile URL must point to one public user profile")
        handle = parts[0]
    elif "/" in handle or "\\" in handle:
        raise platform_error(platform, "enter a username or a complete public profile URL")

    if not handle or handle in {".", ".."}:
        raise platform_error(platform, "could not read a username from that profile URL")
    return handle
