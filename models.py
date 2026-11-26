from datetime import datetime
from typing import Any
from enum import Enum
from sqlalchemy import String, Text, DateTime, func, JSON, ForeignKey, Enum as SQLEnum, Integer, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


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
    pending = "pending"
    success = "success"
    failed = "failed"


class Delivery(Base):
    __tablename__ = "deliveries"
    id:Mapped[int] = mapped_column(primary_key=True)
    event_id:Mapped[int] = mapped_column(
        ForeignKey("events.id"),
        nullable=False
    )
    endpoint_id:Mapped[int] = mapped_column(
        ForeignKey("endpoints.id"),
        nullable=False
    )
    status: Mapped[DeliveryStatus] = mapped_column(
        SQLEnum(
            DeliveryStatus,
            values_callable=lambda enum: [item.value for item in enum]
        ),
        default=DeliveryStatus.pending,
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    attempts: Mapped[list["DeliveryAttempt"]] = relationship(
        back_populates="delivery"
    )

class DeliveryAttempt(Base):
    __tablename__ = "delivery_attempts"
    __table_args__ = (
        UniqueConstraint(
            "delivery_id",
            "attempt_number",
            name="uq_delivery_attempt_number"
        ),
    )
    id:Mapped[int] = mapped_column(primary_key=True)
    delivery_id:Mapped[int] = mapped_column(
        ForeignKey("deliveries.id"), nullable=False
    )
    attempt_number:Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    response_status:Mapped[int] = mapped_column(Integer, nullable=True)
    response_body: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    delivery: Mapped["Delivery"] = relationship(
        back_populates="attempts"
    )