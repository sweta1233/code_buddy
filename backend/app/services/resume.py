"""Resume PDF generation with fpdf2."""

import io
import re
import time
import zipfile
from pathlib import Path
from xml.etree import ElementTree

from fpdf import FPDF
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import PlatformAccount, Snapshot, User
from app.services.stats import overview, topic_analysis

CONVERSION_TEMPLATES = {
    "modern": {"accent": (13, 148, 136), "title": 25, "body": 10, "leading": 5.4, "alignment": "L", "rule": True, "header": "top"},
    "classic": {"accent": (38, 55, 77), "title": 23, "body": 10.5, "leading": 5.8, "alignment": "C", "rule": True, "header": "center"},
    "minimal": {"accent": (71, 85, 105), "title": 26, "body": 10, "leading": 5.6, "alignment": "L", "rule": False, "header": "minimal"},
    "compact": {"accent": (22, 101, 52), "title": 21, "body": 9.3, "leading": 4.8, "alignment": "L", "rule": True, "header": "compact"},
    "creative": {"accent": (109, 40, 217), "title": 25, "body": 10, "leading": 5.5, "alignment": "L", "rule": True, "header": "sidebar"},
    "harvard": {"accent": (32, 39, 49), "title": 23, "body": 10.2, "leading": 5.6, "alignment": "C", "rule": True, "header": "academic"},
    "google": {"accent": (66, 133, 244), "title": 25, "body": 10, "leading": 5.5, "alignment": "L", "rule": True, "header": "google"},
    "linkedin": {"accent": (10, 102, 194), "title": 24, "body": 10, "leading": 5.5, "alignment": "L", "rule": True, "header": "linkedin"},
    "amazon": {"accent": (232, 146, 39), "title": 24, "body": 10, "leading": 5.5, "alignment": "L", "rule": True, "header": "amazon"},
    "microsoft": {"accent": (0, 120, 212), "title": 24, "body": 10, "leading": 5.6, "alignment": "L", "rule": True, "header": "microsoft"},
    "stripe": {"accent": (99, 91, 255), "title": 25, "body": 10, "leading": 5.5, "alignment": "L", "rule": False, "header": "stripe"},
}

SECTION_HEADINGS = {
    "summary", "professional summary", "profile", "career objective", "objective", "experience",
    "work experience", "professional experience", "employment history", "education", "skills",
    "technical skills", "projects", "personal projects", "academic projects", "certifications",
    "certificates", "awards", "achievements", "publications", "volunteer experience", "languages",
    "interests", "references", "coursework", "leadership", "activities",
}


def extract_resume_text(filename: str, content: bytes) -> str:
    """Extract the original readable text without rewriting its wording."""
    extension = Path(filename).suffix.lower()
    if extension in {".txt", ".md"}:
        text = content.decode("utf-8-sig", errors="replace")
    elif extension == ".pdf":
        try:
            from pypdf import PdfReader

            text = "\n\n".join(page.extract_text() or "" for page in PdfReader(io.BytesIO(content)).pages)
        except Exception as exc:
            raise ValueError("Could not read this PDF. It may be damaged or password protected.") from exc
    elif extension == ".docx":
        try:
            with zipfile.ZipFile(io.BytesIO(content)) as archive:
                document_file = archive.getinfo("word/document.xml")
                if document_file.file_size > 20 * 1024 * 1024:
                    raise ValueError("This DOCX contains too much document data.")
                document = ElementTree.fromstring(archive.read(document_file))
            body = document.find(".//{*}body")
            if body is None:
                raise ValueError("No document body was found.")
            blocks = []
            for element in body:
                if element.tag.endswith("}p"):
                    paragraph = "".join(node.text or "" for node in element.iter() if node.tag.endswith("}t"))
                    blocks.append(paragraph)
                elif element.tag.endswith("}tbl"):
                    for row in element:
                        cells = [
                            " ".join(node.text or "" for node in cell.iter() if node.tag.endswith("}t"))
                            for cell in row if cell.tag.endswith("}tc")
                        ]
                        blocks.append(" | ".join(cells))
            text = "\n".join(blocks)
        except Exception as exc:
            raise ValueError("Could not read this DOCX file.") from exc
    else:
        raise ValueError("Upload a PDF, DOCX, TXT, or MD resume.")

    if not text.strip():
        raise ValueError("No readable text was found. Scanned image-only resumes need OCR before conversion.")
    if len(text) > 100_000:
        raise ValueError("This resume has more text than the converter can safely process in one file.")
    return text


def _is_section_heading(line: str) -> bool:
    normalized = re.sub(r"\s+", " ", line.strip().strip(":")).casefold()
    return normalized in SECTION_HEADINGS or (
        len(normalized) <= 64 and len(normalized) > 2 and line.strip().isupper()
    )


def _register_unicode_font(pdf: FPDF) -> str | None:
    candidates = [
        (Path(r"C:\Windows\Fonts\arial.ttf"), Path(r"C:\Windows\Fonts\arialbd.ttf")),
        (Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"), Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")),
    ]
    for regular, bold in candidates:
        if regular.is_file() and bold.is_file():
            pdf.add_font("ResumeSans", style="", fname=str(regular))
            pdf.add_font("ResumeSans", style="B", fname=str(bold))
            return "ResumeSans"
    return None


def convert_resume_layout(content: bytes, filename: str, template: str = "modern") -> bytes:
    """Reflow extracted resume text into a visual template; keep the source wording intact."""
    if template not in CONVERSION_TEMPLATES:
        raise ValueError("Choose one of the available resume templates.")
    original_text = extract_resume_text(filename, content)
    style = CONVERSION_TEMPLATES[template]

    pdf = FPDF(format="A4")
    pdf.set_auto_page_break(auto=True, margin=14)
    pdf.set_margins(20 if template == "creative" else 16, 16, 16)
    pdf.add_page()
    font = _register_unicode_font(pdf) or "Helvetica"
    accent = style["accent"]
    lines = original_text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    title_index = next((index for index, line in enumerate(lines) if line.strip()), None)

    header = style["header"]
    if header == "top":
        pdf.set_fill_color(*accent)
        pdf.rect(0, 0, 210, 5, style="F")
        pdf.set_y(19)
    elif header == "sidebar":
        pdf.set_fill_color(*accent)
        pdf.rect(0, 0, 8, 297, style="F")
        pdf.set_x(20)
    elif header in {"linkedin", "amazon"}:
        pdf.set_fill_color(*(accent if header == "linkedin" else (35, 47, 62)))
        pdf.rect(0, 0, 210, 3, style="F")
        pdf.set_y(19)
    elif header == "microsoft":
        pdf.set_fill_color(*accent)
        pdf.rect(16, 16, 3, 18, style="F")
        pdf.set_y(19)
    elif header == "google":
        for offset, color in enumerate(((66, 133, 244), (234, 67, 53), (251, 188, 5), (52, 168, 83))):
            pdf.set_fill_color(*color)
            pdf.rect(offset * 52.5, 0, 52.5, 3, style="F")
        pdf.set_y(19)
    elif header == "stripe":
        pdf.set_fill_color(*accent)
        pdf.rect(16, 17, 11, 2, style="F")
        pdf.set_y(23)
    elif header == "academic":
        pdf.set_y(19)

    for index, source_line in enumerate(lines):
        if not source_line.strip():
            pdf.ln(2.1 if template == "compact" else 3)
            continue
        is_title = index == title_index
        is_heading = not is_title and _is_section_heading(source_line)
        if is_title:
            pdf.set_font(font, "B", style["title"])
            pdf.set_text_color(*accent)
            pdf.multi_cell(0, 10, source_line.strip(), align=style["alignment"], wrapmode="CHAR")
            pdf.set_text_color(35, 42, 52)
            if style["rule"]:
                pdf.ln(1)
                pdf.set_draw_color(*accent)
                pdf.set_line_width(0.65 if template != "compact" else 0.35)
                pdf.line(pdf.l_margin, pdf.get_y(), 210 - pdf.r_margin, pdf.get_y())
                pdf.ln(3 if template != "compact" else 1.5)
            else:
                pdf.ln(3)
            continue
        if is_heading:
            pdf.ln(2 if template == "compact" else 3.5)
            pdf.set_font(font, "B", 11.5 if template != "compact" else 10.5)
            pdf.set_text_color(*accent)
            pdf.multi_cell(0, style["leading"] + 0.3, source_line.strip(), wrapmode="CHAR")
            if header in {"top", "sidebar", "google", "stripe"}:
                pdf.set_draw_color(*accent)
                pdf.set_line_width(0.25)
                pdf.line(pdf.l_margin, pdf.get_y(), pdf.l_margin + 25, pdf.get_y())
                pdf.ln(1.2)
            pdf.set_text_color(35, 42, 52)
            continue
        pdf.set_font(font, "", style["body"])
        pdf.set_text_color(35, 42, 52)
        pdf.multi_cell(0, style["leading"], source_line, wrapmode="CHAR")

    return bytes(pdf.output())

ACCENTS = {"modern": (14, 165, 164), "classic": (30, 41, 59)}


def _pdf(accent: tuple) -> FPDF:
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.set_draw_color(*accent)
    return pdf


def generate_resume(db: Session, user: User, template: str = "modern", include_plan: bool = True) -> bytes:
    accent = ACCENTS.get(template, ACCENTS["modern"])
    pdf = _pdf(accent)

    # Header
    pdf.set_font("helvetica", "B", 24)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 10, user.name, new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", "", 10.5)
    pdf.set_text_color(90, 90, 90)
    contact = f"{user.email}  |  codebuddy profile: /u/{user.username}"
    if user.college:
        contact += f"  |  {user.college}" + (f" '{user.grad_year}" if user.grad_year else "")
    pdf.cell(0, 6, contact, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)
    pdf.set_line_width(0.6)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(4)

    # Coding profiles section
    accounts = db.execute(
        select(PlatformAccount).where(PlatformAccount.user_id == user.id)
    ).scalars().all()
    snapshots = {
        s.platform: s.stats
        for s in db.execute(
            select(Snapshot).where(Snapshot.user_id == user.id).order_by(Snapshot.captured_at)
        ).scalars()
    }
    urls = {
        "leetcode": "https://leetcode.com/u/{h}",
        "codeforces": "https://codeforces.com/profile/{h}",
        "codechef": "https://www.codechef.com/users/{h}",
        "gfg": "https://www.geeksforgeeks.org/user/{h}/",
    }

    pdf.set_font("helvetica", "B", 13)
    pdf.set_text_color(*accent)
    pdf.cell(0, 8, "COMPETITIVE PROGRAMMING PROFILES", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("helvetica", "", 10.5)
    for account in accounts:
        stats = snapshots.get(account.platform, {})
        label = account.platform.replace("gfg", "GeeksforGeeks").capitalize()
        highlights = []
        for key in ("total_solved", "rating", "max_rating", "stars", "fully_solved", "overall_score", "streak"):
            if stats.get(key) is not None:
                highlights.append(f"{key.replace('_', ' ')}: {stats[key]}")
        pdf.set_font("helvetica", "B", 10.5)
        pdf.cell(0, 6, f"{label} ({account.handle})", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("helvetica", "", 10)
        if highlights:
            pdf.multi_cell(0, 5.5, " | ".join(highlights))
        link = urls.get(account.platform, "").format(h=account.handle)
        if link:
            pdf.set_text_color(90, 90, 90)
            pdf.cell(0, 5, link, link=link, new_x="LMARGIN", new_y="NEXT")
            pdf.set_text_color(0, 0, 0)

    # Skills from solved-problem topics
    topics = topic_analysis(db, user.id)
    top_topics = sorted(topics.items(), key=lambda kv: kv[1], reverse=True)[:14]
    if top_topics:
        pdf.ln(3)
        pdf.set_font("helvetica", "B", 13)
        pdf.set_text_color(*accent)
        pdf.cell(0, 8, "DSA SKILLS (by problems solved)", new_x="LMARGIN", new_y="NEXT")
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("helvetica", "", 10.5)
        pdf.multi_cell(0, 5.5, "  -  ".join(f"{name} ({count})" for name, count in top_topics))

    data = overview(db, user.id)
    totals = data["totals"]
    pdf.ln(3)
    pdf.set_font("helvetica", "B", 13)
    pdf.set_text_color(*accent)
    pdf.cell(0, 8, "OVERALL", new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0, 0, 0)
    pdf.set_font("helvetica", "", 10.5)
    pdf.multi_cell(0, 5.5,
                   f"{totals['solved']} problems solved across platforms "
                   f"(Easy {totals['easy']}, Medium {totals['medium']}, Hard {totals['hard']}) | "
                   f"{totals['active_days']} active days | best rating {totals['rating'] or 'N/A'}")

    return bytes(pdf.output())


def timestamped_name(username: str) -> str:
    return f"{username}_codebuddy_resume_{int(time.time())}.pdf"
