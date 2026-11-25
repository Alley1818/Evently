from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Any
from models import DeliveryStatus

class EndpointCreate(BaseModel):
    name: str
    url: str


class EndpointResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    url: str
    created_at: datetime


class EventCreate(BaseModel):
    event_type: str
    data: dict[str, Any]


class EventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_type: str
    data: dict[str, Any]
    created_at: datetime


class DeliveryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_id: int
    endpoint_id: int
    status: DeliveryStatus
    created_at: datetime
    updated_at: datetime