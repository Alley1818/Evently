from sqlalchemy import select
from sqlalchemy.orm import Session
from models import Endpoint, Event


class Repository:
    @staticmethod
    def save_endpoint(url:str, name:str, db:Session):
        new_endpoint = Endpoint(
            url=url,
            name=name
        )

        db.add(new_endpoint)
        db.commit()
        db.refresh(new_endpoint)
        return new_endpoint

    @staticmethod
    def save_event(event_type: str, data: dict, db: Session):
        new_event = Event(
            event_type=event_type,
            data=data,
        )

        db.add(new_event)
        db.commit()
        db.refresh(new_event)
        return new_event


    @staticmethod
    def get_events(db: Session):
        all_events = select(Event).order_by(Event.created_at.desc())
        result = db.scalars(all_events).all()
        return result


    @staticmethod
    def get_related_endpoints(db: Session):
        endpoints = select(Endpoint)
        result = db.scalars(endpoints).all()
        return result


