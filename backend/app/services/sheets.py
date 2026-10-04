"""Bundled and user-imported problem sheets and per-user progress."""

import csv
import html as html_lib
import ipaddress
import json
import re
import socket
from pathlib import Path
from urllib.parse import urljoin, urlparse, urlunparse

import httpx
from bs4 import BeautifulSoup
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.base import SessionLocal
from app.models import Sheet, SheetProgress, SheetQuestion, Submission

DATA_DIR = Path(__file__).resolve().parent / "sheets_data"
PROBLEM_HOSTS = {
    "leetcode.com": "leetcode", "codeforces.com": "codeforces", "codechef.com": "codechef",
    "geeksforgeeks.org": "gfg", "hackerrank.com": "hackerrank", "atcoder.jp": "atcoder",
    "neetcode.io": "neetcode", "leetcode.cn": "leetcode", "interviewbit.com": "interviewbit",
    "codingninjas.com": "code360", "naukri.com": "code360", "cses.fi": "cses",
    "spoj.com": "spoj", "open.kattis.com": "kattis", "hackerearth.com": "hackerearth",
    "projecteuler.net": "projecteuler",
}


def seed_sheets() -> None:
    """Create/update the Sheet + SheetQuestion rows from bundled JSON files. Idempotent."""
    db = SessionLocal()
    try:
        for path in sorted(DATA_DIR.glob("*.json")):
            data = json.loads(path.read_text(encoding="utf-8"))
            sheet = db.execute(select(Sheet).where(Sheet.slug == data["slug"])).scalars().first()
            if sheet is None:
                sheet = Sheet(slug=data["slug"], name=data["name"], description=data.get("description", ""),
                              source_url=data.get("source_url", ""))
                db.add(sheet)
                db.flush()
            else:
                db.query(SheetQuestion).filter(SheetQuestion.sheet_id == sheet.id).delete()
            for i, q in enumerate(data["questions"]):
                db.add(SheetQuestion(
                    sheet_id=sheet.id, order_no=i, title=q["title"], slug=q.get("slug", ""),
                    url=q.get("url", ""), difficulty=q.get("difficulty", ""), topics=q.get("topics", []),
                ))
        db.commit()
    finally:
        db.close()


def _safe_public_url(value: str) -> str:
    parsed = urlparse(value.strip())
    if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("Enter a public http or https link to a sheet.")
    host = parsed.hostname.rstrip(".").lower()
    if host == "localhost" or host.endswith((".localhost", ".local")):
        raise ValueError("Local and private network links cannot be imported.")
    try:
        addresses = {ipaddress.ip_address(item[4][0]) for item in socket.getaddrinfo(host, None)}
    except (OSError, ValueError) as exc:
        raise ValueError("The sheet link could not be reached. Check that it is public and try again.") from exc
    if not addresses or any(not address.is_global for address in addresses):
        raise ValueError("Local and private network links cannot be imported.")
    return urlunparse((parsed.scheme, parsed.netloc, parsed.path or "/", "", parsed.query, ""))


def _platform_for_problem_url(value: str) -> str | None:
    host = (urlparse(value).hostname or "").lower().removeprefix("www.")
    return PROBLEM_HOSTS.get(host)


def _is_problem_link(value: str) -> bool:
    platform = _platform_for_problem_url(value)
    path = urlparse(value).path.lower()
    patterns = {
        "leetcode": r"/problems/[^/]+/?$",
        "codeforces": r"/(?:contest|gym)/\d+/problem/[^/]+/?$|/problemset/problem/\d+/[^/]+/?$",
        "codechef": r"/problems/[^/]+/?$",
        "gfg": r"/(?:problems|practice)/[^/]+/?$",
        "hackerrank": r"/challenges/[^/]+/?$",
        "atcoder": r"/contests/[^/]+/tasks/[^/]+/?$",
        "neetcode": r"/problems/[^/]+/?$",
        "interviewbit": r"/problems/[^/]+/?$",
        "code360": r"/(?:code360|studio)/problems/[^/]+/?$|/codingninjas/[^/]+/?$",
        "cses": r"/problemset/task/\d+/?$",
        "spoj": r"/problems/[^/]+/?$",
        "kattis": r"/problems/[^/]+/?$",
        "hackerearth": r"/(?:problem|practice)/[^/]+(?:/[^/]+)*/?$",
        "projecteuler": r"/",
    }
    if platform == "projecteuler":
        return bool(re.fullmatch(r"\d+", urlparse(value).query.removeprefix("problem=")))
    return bool(platform and re.search(patterns[platform], path))


def _clean_text(value: str, limit: int = 300) -> str:
    return re.sub(r"\s+", " ", value).strip(" \t\r\n#-*•")[:limit]


def _google_sheet_csv_url(value: str) -> str | None:
    parsed = urlparse(value)
    if (parsed.hostname or "").lower() not in {"docs.google.com", "sheets.google.com"}:
        return None
    published = re.search(r"/spreadsheets/d/e/([^/]+)", parsed.path)
    if published:
        gid = re.search(r"(?:^|&)gid=(\d+)(?:&|$)", parsed.query)
        query = f"output=csv&gid={gid.group(1)}" if gid else "output=csv"
        return f"https://docs.google.com/spreadsheets/d/e/{published.group(1)}/pub?{query}"
    match = re.search(r"/spreadsheets/d/([^/]+)", parsed.path)
    if not match:
        return None
    gid = re.search(r"(?:^|&)gid=(\d+)(?:&|$)", parsed.query)
    query = f"format=csv&gid={gid.group(1)}" if gid else "format=csv"
    return f"https://docs.google.com/spreadsheets/d/{match.group(1)}/export?{query}"


def _problem_candidates_from_csv(content: str) -> list[tuple[str, str]]:
    candidates: list[tuple[str, str]] = []
    for row in csv.reader(content.splitlines()):
        cells = [_clean_text(html_lib.unescape(cell), 500) for cell in row]
        urls: list[str] = []
        for cell in row:
            normalized = html_lib.unescape(cell).replace("\\/", "/")
            urls.extend(re.findall(r"https?://[^\s\"'<>),]+", normalized))
        title_cells = [cell for cell in cells if cell and not re.search(r"https?://", cell, re.I)]
        for link in urls:
            link = link.rstrip(".,;:!?")
            if _is_problem_link(link):
                parsed = urlparse(link)
                title = next((value for value in title_cells if len(value) >= 3), "")
                if not title:
                    title = re.sub(r"[-_]+", " ", parsed.path.strip("/").split("/")[-1]).title()
                candidates.append((_clean_text(title), link))
    return candidates


def fetch_public_sheet(source_url: str) -> tuple[str, str, list[dict]]:
    """Fetch one public web page and find supported coding-problem links in it."""
    current_url = _safe_public_url(source_url)
    if _is_problem_link(current_url):
        segment = urlparse(current_url).path.strip("/").split("/")[-1]
        title = re.sub(r"[-_]+", " ", segment).strip().title() or "Coding problem"
        question = {"title": title, "url": current_url, "slug": "", "difficulty": "", "topics": []}
        return f"{title} — Problem", "Imported directly from the coding problem link.", [question]

    original_url = current_url
    reader_used = False
    csv_source = _google_sheet_csv_url(current_url)
    request_url = _safe_public_url(csv_source) if csv_source else current_url
    with httpx.Client(timeout=12, follow_redirects=False, headers={"User-Agent": "CodeBuddy-SheetImporter/1.0"}) as client:
        for _ in range(5):
            request_url = _safe_public_url(request_url)
            response = client.get(request_url)
            if response.is_redirect:
                location = response.headers.get("location")
                if not location:
                    raise ValueError("The sheet site returned an invalid redirect.")
                request_url = urljoin(request_url, location)
                continue
            if response.status_code in {401, 403, 429} or response.status_code >= 500:
                # Some public coding sites block server-side requests; use the public text reader fallback.
                reader_url = _safe_public_url(f"https://r.jina.ai/{request_url}")
                response = client.get(reader_url)
                reader_used = True
            if response.status_code >= 400:
                raise ValueError(f"The sheet site returned HTTP {response.status_code}. Make sure the page is public.")
            if len(response.content) > 4 * 1024 * 1024:
                raise ValueError("The sheet page is too large to import (4 MB maximum).")
            content_type = response.headers.get("content-type", "").lower()
            if not any(kind in content_type for kind in ("text/html", "text/plain", "application/xhtml", "text/csv", "application/csv")):
                raise ValueError("This link does not point to a readable public web page.")
            html = response.text
            break
        else:
            raise ValueError("The sheet page redirected too many times.")

    soup = BeautifulSoup(html, "html.parser")
    og_title = soup.find("meta", property="og:title")
    heading = soup.find("h1")
    page_title = (og_title.get("content", "") if og_title else "") or (
        heading.get_text(" ", strip=True) if heading else ""
    ) or (soup.title.get_text(" ", strip=True) if soup.title else "")
    page_title = _clean_text(page_title) or (urlparse(current_url).hostname or "Imported sheet")
    description_tag = soup.find("meta", attrs={"name": "description"})
    description = _clean_text(description_tag.get("content", ""), 1000) if description_tag else ""
    if csv_source:
        page_title = "Google Sheets problem list"
        description = description or "Imported from a public Google Sheet."

    candidates: list[tuple[str, str]] = _problem_candidates_from_csv(html) if "csv" in content_type else []
    for anchor in soup.find_all("a", href=True):
        link = urljoin(current_url, anchor["href"])
        if not _is_problem_link(link):
            continue
        parsed = urlparse(link)
        clean_link = urlunparse((parsed.scheme, parsed.netloc, parsed.path.rstrip("/"), "", "", ""))
        title = _clean_text(anchor.get_text(" ", strip=True) or anchor.get("aria-label", ""))
        if len(title) < 3:
            slug = parsed.path.strip("/").split("/")[-1]
            title = _clean_text(re.sub(r"[-_]+", " ", slug).title())
        if len(title) >= 3 and title.lower() not in {"solve", "solution", "practice", "here", "link"}:
            candidates.append((title, clean_link))
    # GitHub README pages and the public reader expose Markdown links as source text.
    for title, link in re.findall(r"\[([^\]]+)\]\((https?://[^)\s]+)\)", html):
        if _is_problem_link(link):
            candidates.append((_clean_text(title), link.rstrip("/")))
    # Some public lists place raw problem URLs in plain text or code blocks rather
    # than exposing them as clickable anchors or Markdown links.
    raw_text = html_lib.unescape(html).replace("\\/", "/")
    for link in re.findall(r"https?://[^\s\"'<>),\]]+", raw_text):
        link = link.rstrip(".,;:!?")
        if _is_problem_link(link):
            path = urlparse(link).path
            title = re.sub(r"[-_]+", " ", path.strip("/").split("/")[-1]).title()
            candidates.append((_clean_text(title), link))

    problems: dict[str, dict] = {}
    for title, link in candidates:
        key = link.lower()
        problems.setdefault(key, {"title": title, "url": link, "slug": "", "difficulty": "", "topics": []})
    if not problems:
        if not reader_used:
            try:
                _, reader_description, reader_problems = fetch_public_sheet(f"https://r.jina.ai/{original_url}")
                sheet_name = page_title
                if sheet_name == (urlparse(current_url).hostname or "") or "r.jina.ai" in sheet_name.lower():
                    slug = urlparse(current_url).path.strip("/").split("/")[-1]
                    sheet_name = _clean_text(re.sub(r"[-_]+", " ", slug).title(), 200) or "Imported sheet"
                return sheet_name, description or reader_description, reader_problems
            except (ValueError, httpx.HTTPError):
                pass
        raise ValueError(
            "No public coding problem links were found. Make the sheet viewable without signing in and include direct problem URLs."
        )
    if len(problems) > 500:
        raise ValueError("This sheet has more than 500 problems. Import a smaller public sheet.")
    return page_title[:200], description, list(problems.values())


def _problem_keys(url: str, title: str) -> set[str]:
    """Create stable keys to compare a sheet item with synced accepted submissions."""
    platform = _platform_for_problem_url(url)
    path = urlparse(url).path.strip("/").lower()
    keys: set[str] = set()
    segments = path.split("/")
    if platform == "leetcode":
        match = re.search(r"problems/([^/]+)", path)
        if match:
            keys.add(f"leetcode:{match.group(1)}")
    elif platform == "codeforces":
        for marker in ("contest", "gym", "problemset/problem"):
            if marker == "problemset/problem" and marker in path:
                parts = path.split("problemset/problem/", 1)[1].split("/")
                if len(parts) >= 2:
                    keys.add(f"codeforces:{parts[0]}:{parts[1]}")
                break
            if marker in segments:
                index = segments.index(marker)
                if len(segments) > index + 3 and segments[index + 2] == "problem":
                    keys.add(f"codeforces:{segments[index + 1]}:{segments[index + 3]}")
                break
    elif platform == "codechef":
        match = re.search(r"problems/([^/]+)", path)
        if match:
            keys.add(f"codechef:{match.group(1)}")
    elif platform == "gfg":
        match = re.search(r"(?:problems|practice)/([^/]+)", path)
        if match:
            keys.add(f"gfg:{match.group(1)}")
    elif platform == "hackerrank":
        match = re.search(r"challenges/([^/]+)", path)
        if match:
            keys.add(f"hackerrank:{match.group(1)}")
    elif platform == "atcoder":
        match = re.search(r"tasks/([^/]+)", path)
        if match:
            keys.add(f"atcoder:{match.group(1)}")
    elif platform == "neetcode":
        match = re.search(r"problems/([^/]+)", path)
        if match:
            keys.add(f"neetcode:{match.group(1)}")
    normalized_title = re.sub(r"[^a-z0-9]+", "", title.casefold())
    if platform and len(normalized_title) >= 5:
        keys.add(f"{platform}:title:{normalized_title}")
    return keys


def sheet_with_progress(db: Session, sheet_slug: str, user_id: int) -> dict | None:
    sheet = db.execute(select(Sheet).where(Sheet.slug == sheet_slug)).scalars().first()
    if sheet is None:
        return None
    progress = {
        p.question_id: p.status
        for p in db.execute(select(SheetProgress).where(
            SheetProgress.user_id == user_id,
            SheetProgress.question_id.in_([q.id for q in sheet.questions]),
        )).scalars()
    }
    submissions = db.execute(select(Submission).where(Submission.user_id == user_id)).scalars().all()
    solved_keys = set().union(*(_problem_keys(s.url, s.title) for s in submissions)) if submissions else set()
    questions = []
    for q in sorted(sheet.questions, key=lambda item: item.order_no):
        matched_submission = bool(_problem_keys(q.url, q.title) & solved_keys)
        stored_status = progress.get(q.id, "todo")
        status = "done" if matched_submission or stored_status == "done" else stored_status
        questions.append({
            "id": q.id, "order": q.order_no, "title": q.title, "slug": q.slug, "url": q.url,
            "difficulty": q.difficulty, "topics": q.topics, "status": status,
        })
    done = sum(1 for q in questions if q["status"] == "done")
    return {
        "slug": sheet.slug, "name": sheet.name, "description": sheet.description,
        "source_url": sheet.source_url, "total": len(questions), "done": done, "questions": questions,
    }
