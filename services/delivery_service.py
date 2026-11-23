from select import select

import httpx

from sqlalchemy.orm import Session

from models import (
    Delivery,
    DeliveryAttempt,
    DeliveryStatus,
    Event,
    Endpoint
)

from services.http_service import send_event


def process_delivery(
    db: Session,
    delivery: Delivery,
    event: Event,
    endpoint: Endpoint
):
    attempt = DeliveryAttempt(
        delivery_id=delivery.id,
        attempt_number=len(delivery.attempts) + 1
    )

    try:
        response = send_event(event, endpoint)

        attempt.response_status = response.status_code
        attempt.response_body = response.text

        delivery.status = DeliveryStatus.SUCCESS

    except httpx.HTTPStatusError as err:
        attempt.response_status = err.response.status_code
        attempt.response_body = err.response.text
        attempt.error_message = str(err)

        delivery.status = DeliveryStatus.FAILED

    except httpx.RequestError as err:
        attempt.error_message = str(err)

        delivery.status = DeliveryStatus.FAILED

    db.add(attempt)
    db.commit()

    return attempt


def create_deliveries(db: Session, event: Event):
    statement = select(Endpoint)
    endpoints = db.scalars(statement).all()

    deliveries = []

    for endpoint in endpoints:
        delivery = Delivery(
            event_id=event.id,
            endpoint_id=endpoint.id,
            status=DeliveryStatus.PENDING
        )

        db.add(delivery)
        deliveries.append(delivery)

    db.commit()

    return deliveries