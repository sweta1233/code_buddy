import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, HumanMessage
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.mentor import build_mentor_graph
from app.api.deps import get_current_user
from app.db.base import get_db, SessionLocal
from app.models import ChatMessage, ChatSession, User

router = APIRouter(prefix="/api/ai", tags=["ai"])


class ChatIn(BaseModel):
    session_id: int | None = None
    message: str


def _session_out(s: ChatSession) -> dict:
    return {"id": s.id, "title": s.title, "created_at": s.created_at.isoformat()}


@router.get("/sessions")
def list_sessions(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.execute(
        select(ChatSession).where(ChatSession.user_id == user.id).order_by(ChatSession.created_at.desc())
    ).scalars().all()
    return {"sessions": [_session_out(s) for s in rows]}


@router.get("/sessions/{session_id}/messages")
def get_messages(session_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.get(ChatSession, session_id)
    if session is None or session.user_id != user.id:
        raise HTTPException(404, "Session not found")
    rows = db.execute(
        select(ChatMessage).where(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at)
    ).scalars().all()
    return {"messages": [{"role": m.role, "content": m.content} for m in rows]}


@router.post("/chat")
def chat(body: ChatIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    message = body.message.strip()
    if not message:
        raise HTTPException(400, "Empty message")

    if body.session_id is None:
        session = ChatSession(user_id=user.id, title=message[:60])
        db.add(session)
        db.commit()
        db.refresh(session)
    else:
        session = db.get(ChatSession, body.session_id)
        if session is None or session.user_id != user.id:
            raise HTTPException(404, "Session not found")

    history_rows = db.execute(
        select(ChatMessage).where(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at.desc()).limit(20)
    ).scalars().all()
    history = [
        HumanMessage(content=m.content) if m.role == "user" else AIMessage(content=m.content)
        for m in reversed(history_rows)
    ]
    db.add(ChatMessage(session_id=session.id, user_id=user.id, role="user", content=message))
    db.commit()

    session_id, user_id, user_name = session.id, user.id, user.name
    first_message = body.session_id is None

    def event_stream():
        db_stream = SessionLocal()
        try:
            graph = build_mentor_graph(db_stream, user_id, user_name)
            inputs = {"messages": history + [HumanMessage(content=message)]}
            partial = ""
            for chunk, meta in graph.stream(inputs, stream_mode="messages", config={"recursion_limit": 25}):
                if meta.get("langgraph_node") != "agent":
                    continue
                content = chunk.content
                if isinstance(content, list):
                    content = "".join(
                        p.get("text", "") for p in content if isinstance(p, dict) and p.get("type") == "text"
                    )
                if content:
                    partial += content
                    yield f"data: {json.dumps({'token': content})}\n\n"
            db_stream.add(ChatMessage(session_id=session_id, user_id=user_id, role="assistant", content=partial))
            db_stream.commit()
            yield f"data: {json.dumps({'done': True, 'session_id': session_id, 'title': (message[:60] if first_message else None)})}\n\n"
        finally:
            db_stream.close()

    return StreamingResponse(event_stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})
