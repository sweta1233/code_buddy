from app.services.platforms import atcoder, codechef, codeforces, gfg, hackerrank, leetcode
from app.services.platforms.base import PlatformError

ADAPTERS = {
    "leetcode": leetcode,
    "codeforces": codeforces,
    "codechef": codechef,
    "gfg": gfg,
    "hackerrank": hackerrank,
    "atcoder": atcoder,
}

SUPPORTED_PLATFORMS = list(ADAPTERS)


def get_adapter(platform: str):
    adapter = ADAPTERS.get(platform)
    if adapter is None:
        raise PlatformError(f"unsupported platform '{platform}'")
    return adapter


__all__ = ["ADAPTERS", "SUPPORTED_PLATFORMS", "PlatformError", "get_adapter"]
