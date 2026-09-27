class PlatformError(Exception):
    """Raised when a platform adapter cannot fetch or parse a profile."""


# Every adapter returns this normalized shape:
# {"stats": {...}, "submissions": [{external_id, title, url, difficulty, topics, solved_at}], "contests": [...]}
def platform_error(platform: str, message: str) -> PlatformError:
    return PlatformError(f"{platform}: {message}")
