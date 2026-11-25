from typing import List

from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from services.delivery_service import dispatch_delivery
from db import get_db
from repository import Repository
from schemas import EventCreate, EventResponse, EndpointResponse, DeliveryResponse

app = FastAPI()


@app.post("/endpoints", response_model=EndpointResponse)
def endpoint(url:str, name:str, db = Depends(get_db)):
    new_endpoint = Repository.save_endpoint(
        url=url,
        name=name,
        db=db
    )
    return new_endpoint


@app.post("/events", response_model=EventResponse)
def create_event(
    event: EventCreate,
    db: Session = Depends(get_db)
):
    new_event = Repository.save_event(
        event_type=event.event_type,
        data=event.data,
        db=db
    )
    dispatch_delivery(db, new_event)
    return new_event

@app.get("/events", response_model=List[EventResponse])
def get_events(db: Session = Depends(get_db)):
    all_events = Repository.get_events(db=db)
    return all_events

@app.get("/events/{event_id}", response_model=EventResponse)
def get_event_by_id(event_id:int, db: Session = Depends(get_db)):
    event = Repository.get_event_by_id(event_id=event_id, db=db)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")

    return event


@app.get("/deliveries", response_model=list[DeliveryResponse])
def get_deliveries(db: Session = Depends(get_db)):
    deliveries = Repository.get_deliveries(db=db)
    return deliveries