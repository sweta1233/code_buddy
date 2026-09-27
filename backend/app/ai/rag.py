"""RAG indexing + retrieval over solved problems and the DSA knowledge base."""

import logging

from langchain_core.documents import Document
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.knowledge_base import KNOWLEDGE
from app.ai.vectorstore import collection_count, knowledge_collection, user_collection
from app.models import Submission

logger = logging.getLogger(__name__)

MAX_INDEXED_SUBMISSIONS = 500
EMBED_BATCH = 50  # stay friendly to Gemini free-tier embedding rate limits


def index_knowledge_base() -> None:
    """Seed the shared knowledge collection once (idempotent)."""
    store = knowledge_collection()
    if collection_count(store) > 0:
        return
    docs = [Document(page_content=note["content"], metadata={"topic": note["topic"]}) for note in KNOWLEDGE]
    ids = [note["topic"] for note in KNOWLEDGE]
    store.add_documents(docs, ids=ids)
    logger.info("indexed %d knowledge notes", len(docs))


def index_user_submissions(db: Session, user_id: int) -> int:
    rows = db.execute(
        select(Submission).where(Submission.user_id == user_id).order_by(Submission.solved_at.desc().nullslast())
    ).scalars().all()[:MAX_INDEXED_SUBMISSIONS]
    if not rows:
        return 0

    store = user_collection(user_id)
    docs, ids = [], []
    for s in rows:
        topics = ", ".join(s.topics or []) or "unknown topics"
        text = f"{s.title} ({s.platform}). Topics: {topics}. Difficulty: {s.difficulty or 'unknown'}."
        docs.append(Document(
            page_content=text,
            metadata={
                "platform": s.platform,
                "difficulty": s.difficulty,
                "title": s.title,
                "url": s.url,
                "topics": topics,
            },
        ))
        ids.append(f"{s.platform}:{s.external_id}")

    for start in range(0, len(docs), EMBED_BATCH):
        batch_docs, batch_ids = docs[start:start + EMBED_BATCH], ids[start:start + EMBED_BATCH]
        store.add_documents(batch_docs, ids=batch_ids)
    logger.info("indexed %d submissions for user %d", len(docs), user_id)
    return len(docs)


def search_my_problems(user_id: int, query: str, k: int = 8) -> list[Document]:
    store = user_collection(user_id)
    if collection_count(store) == 0:
        return []
    return store.similarity_search(query, k=k)


def search_knowledge(query: str, k: int = 2) -> list[Document]:
    store = knowledge_collection()
    if collection_count(store) == 0:
        return []
    return store.similarity_search(query, k=k)
