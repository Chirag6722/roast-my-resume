import os
import warnings
from pathlib import Path
from dotenv import load_dotenv

# backend/.env — loaded before any setting is read. Real environment variables win.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")


class Settings:
    PROJECT_NAME: str = "Roast My Resume"
    # This fallback is published in the public repository, so a deployment that
    # does not override it can have its session tokens forged by anyone. The
    # warning below fires whenever the default is in use.
    DEFAULT_SECRET_KEY: str = "roast_super_secret_ember_flames_key_2026"
    SECRET_KEY: str = os.getenv("SECRET_KEY", DEFAULT_SECRET_KEY)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Database
    SQLITE_DB_PATH: str = os.getenv("SQLITE_DB_PATH", "roast_app.db")

    # CORS
    CORS_ORIGINS: list = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]


settings = Settings()

if settings.SECRET_KEY == Settings.DEFAULT_SECRET_KEY:
    warnings.warn(
        "SECRET_KEY is unset, so the built-in development default is being used. "
        "It is public, which means anyone can forge a login token. Set SECRET_KEY "
        "in backend/.env before deploying this anywhere reachable.",
        RuntimeWarning,
        stacklevel=2,
    )
