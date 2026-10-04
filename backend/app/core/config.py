from pathlib import Path

from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    app_name: str = "CodeBuddy API"
    secret_key: str = "dev-secret-change-me"
    access_token_expire_hours: int = 24 * 7
    database_url: str = f"sqlite:///{BASE_DIR / 'codebuddy.db'}"
    chroma_dir: str = str(BASE_DIR / "data" / "chroma")
    # Support either hostname developers commonly use for the local frontend.
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    cors_origin_regex: str = r"https://.*\.vercel\.app"
    google_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    embedding_model: str = "gemini-embedding-001"

    model_config = {"env_file": BASE_DIR / ".env", "extra": "ignore"}


settings = Settings()
