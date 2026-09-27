from app.services.platforms import codechef, codeforces, gfg, leetcode
from app.services.platforms.base import PlatformError

ADAPTERS = {
    "leetcode": leetcode,
    "codeforces": codeforces,
    "codechef": codechef,
    "gfg": gfg,
}

SUPPORTED_PLATFORMS = list(ADAPTERS)


def get_adapter(platform: str):
    adapter = ADAPTERS.get(platform)
    if adapter is None:
        raise PlatformError(f"unsupported platform '{platform}'")
    return adapter


__all__ = ["ADAPTERS", "SUPPORTED_PLATFORMS", "PlatformError", "get_adapter"]
