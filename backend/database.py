"""Database engine, session factory and declarative base for StockFlow.

PostgreSQL is used when DATABASE_URL is set (Render/production). When it is
missing, the app falls back to a local SQLite file so development works without
any external service.
"""

import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

DEFAULT_SQLITE_URL = "sqlite:///./stockflow.db"


def normalize_database_url(url: str) -> str:
    """Heroku/Render style URLs start with postgres:// which SQLAlchemy rejects."""
    if url.startswith("postgres://"):
        return "postgresql://" + url[len("postgres://") :]
    return url


DATABASE_URL = normalize_database_url(os.getenv("DATABASE_URL", DEFAULT_SQLITE_URL))
IS_SQLITE = DATABASE_URL.startswith("sqlite")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if IS_SQLITE else {},
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a request-scoped session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all tables that do not exist yet."""
    import models  # noqa: F401  (registers the mappers before create_all)

    Base.metadata.create_all(bind=engine)
