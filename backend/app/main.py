import logging
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import ai, auth, contests, interview, plans, platforms, portfolio, resume, sheets, stats
from app.core.config import settings
from app.db.base import Base, engine
from app.services.scheduler import scheduler, start_scheduler
from app.services.sheets import seed_sheets

logging.basicConfig(level=logging.INFO)


def _index_knowledge_base_in_background() -> None:
    from app.ai.rag import index_knowledge_base

    try:
        index_knowledge_base()
    except Exception as exc:
        logging.getLogger(__name__).warning(
            "Knowledge base indexing skipped (LLM features will not work until GOOGLE_API_KEY is valid): %s", exc
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    seed_sheets()
    threading.Thread(target=_index_knowledge_base_in_background, name="knowledge-base-indexer", daemon=True).start()
    start_scheduler()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in (auth, platforms, stats, ai, interview, plans, sheets, contests, portfolio, resume):
    app.include_router(router.router)


@app.get("/health")
def health():
    return {"status": "ok", "app": "CodeBuddy"}
