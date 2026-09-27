from langchain_chroma import Chroma

from app.ai.llm import get_embeddings
from app.core.config import settings


def user_collection(user_id: int) -> Chroma:
    """Per-user vector store of solved problems (RAG over their own coding history)."""
    return Chroma(
        collection_name=f"user_{user_id}",
        embedding_function=get_embeddings(),
        persist_directory=settings.chroma_dir,
    )


def knowledge_collection() -> Chroma:
    """Shared vector store of DSA concept notes the mentor can teach from."""
    return Chroma(
        collection_name="knowledge_base",
        embedding_function=get_embeddings(),
        persist_directory=settings.chroma_dir,
    )


def collection_count(store: Chroma) -> int:
    """Number of documents in a Chroma vector store (langchain-chroma 1.x exposes no count())."""
    return store._collection.count()
