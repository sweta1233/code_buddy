"""Resume PDF generation with fpdf2."""

import time

from fpdf import FPDF
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import PlatformAccount, Snapshot, User
from app.services.stats import overview, topic_analysis

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
