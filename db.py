from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

DATABASE_URL = "postgresql+psycopg://evently:evently_password@localhost:5433/evently"

engine = create_engine(DATABASE_URL, echo=True)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False
)

def get_db() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session