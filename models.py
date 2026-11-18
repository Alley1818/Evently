from datetime import datetime
from typing import Any
from enum import Enum
from sqlalchemy import String, DateTime, func, JSON, ForeignKey, Enum as SQLEnum
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


class DeliveryStatus(str, Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"


class Delivery(Base):
    __tablename__ = "deliveries"
    id:Mapped[int] = mapped_column(primary_key=True)
    event_id:Mapped[int] = mapped_column(
        ForeignKey("events.id")
    )
    endpoint_id:Mapped[int] = mapped_column(
        ForeignKey("endpoints.id")
    )
    status: Mapped[DeliveryStatus] = mapped_column(
        SQLEnum(
            DeliveryStatus,
            values_callable=lambda enum: [item.value for item in enum]
        ),
        default=DeliveryStatus.PENDING
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )