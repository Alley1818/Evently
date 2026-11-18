import httpx

from models import Event, Endpoint


def send_event(event: Event, endpoint: Endpoint):
    payload = {
        "event_type": event.event_type,
        "data": event.data
    }

    response = httpx.post(
        url=endpoint.url,
        json=payload,
        timeout=10.0
    )

    response.raise_for_status()

    return response