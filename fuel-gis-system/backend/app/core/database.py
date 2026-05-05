from sqlalchemy import create_engine
from sqlalchemy.engine.url import make_url
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings


def _build_engine_kwargs(database_url: str) -> dict:
    """Return SQLAlchemy engine options for local PostgreSQL or cloud PostgreSQL.

    Supabase is PostgreSQL-compatible, so the application can keep SQLAlchemy models
    and only replace the DATABASE_URL. Supabase requires SSL for external clients.
    """
    kwargs: dict = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
        "future": True,
    }

    try:
        parsed_url = make_url(database_url)
        host = parsed_url.host or ""
        query = dict(parsed_url.query)

        if "supabase" in host and "sslmode" not in query:
            kwargs["connect_args"] = {"sslmode": "require"}
    except Exception:
        pass

    return kwargs


engine = create_engine(
    settings.DATABASE_URL,
    **_build_engine_kwargs(settings.DATABASE_URL),
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()