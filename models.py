from datetime import datetime
from typing import Any

from sqlalchemy import String, DateTime, func, JSON
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass

class Endpoint(Base):
    __tablename__ = "endpoints"
    id:Mapped[int] = mapped_column(primary_key=True)
    name:Mapped[str] = mapped_column(String(50))
    url: Mapped[str] = mapped_column(String(2048))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

class Event(Base):
    __tablename__ = "events"
    id:Mapped[int] = mapped_column(primary_key=True)
    event_type:Mapped[str] = mapped_column(String(240))
    data: Mapped[dict[str, Any]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
