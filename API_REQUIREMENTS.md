# Evently dashboard API requirements

## Existing routes

The Live dashboard follows the route signatures in `main.py` and the response models in `schemas.py`.

| Method and path | Request | Successful response |
| --- | --- | --- |
| `GET /events` | No parameters | Array of events, newest first |
| `GET /events/{event_id}` | Integer path parameter | One event object, or `404` for a missing ID |
| `POST /events` | JSON body with `event_type` (string) and `data` (JSON object) | Created event. The route dispatches it to every registered endpoint before responding. |
| `POST /endpoints` | URL-encoded `name` and `url` query parameters | Created endpoint |
| `GET /deliveries` | No parameters | Array of delivery summaries with `id`, `event_id`, `endpoint_id`, `status`, `created_at`, and `updated_at`, newest first. |

An event contains `id`, `event_type`, `data`, and `created_at`. An endpoint contains `id`, `name`, `url`, and `created_at`. IDs are integers and timestamps are ISO 8601 strings with an offset. The frontend reads FastAPI's string `detail` and its field-level validation errors.

### Backend defects in this checkout

- `main.py` imports and calls `dispatch_delivery`. `services/delivery_service.py` defines `dispatch_event`. Importing the FastAPI app currently fails.
- `create_deliveries` uses `select` from Python's standard library where it needs `sqlalchemy.select`. `POST /events` commits the event and then raises a `TypeError` when it looks up destinations.
- `Repository.get_event_by_id` returns `.all()`. The route needs a single `Event` or `None` to satisfy `EventResponse` and return `404` for unknown IDs.
- Event persistence commits before dispatch. A failed HTTP response to `POST /events` can follow a committed event. Safe automatic retries would require idempotency or a documented reconciliation mechanism.

## API additions for the dashboard

These contracts extend the current API. The dashboard surfaces unavailable Live states for the missing features.

| Method and path | Dashboard need |
| --- | --- |
| `GET /overview?from=<timestamp>&to=<timestamp>&interval=<duration>` | Return aggregate event and delivery counts, succeeded/failed/pending counts, success rate, registered endpoint count, delivery activity buckets, and endpoint health for the requested period. |
| `GET /endpoints` | List endpoints with search, sorting, and pagination. Include per-endpoint delivery totals and statuses where available. |
| `GET /endpoints/{endpoint_id}` | Return endpoint metadata; support a stable link from delivery details. |
| `GET /deliveries` | List deliveries with filters for event ID, endpoint ID, status, event type, last HTTP status, and creation time range. Provide stable descending creation order and cursor pagination. |
| `GET /deliveries/{delivery_id}` | Return delivery details, associated event and endpoint, and ordered attempt history. |

- **Overview.** Compute global aggregates from the complete dataset. Use `success / (success + failed)` for the terminal delivery success rate and return `null` when no deliveries have finished. Return bucket start timestamps and separate success and failed counts, including zero-volume buckets. Define endpoint health over the selected period using delivery status counts.
- **Events.** Add server-side search by event ID and type, date range, sort order, and cursor pagination when list volume grows. Supply per-event success, failed, and pending delivery counts in summaries and expose actual related deliveries through `GET /deliveries?event_id=…`.
- **Deliveries.** Include `id`, `event_id`, `endpoint_id`, `status`, `created_at`, `updated_at`, event type, endpoint name, attempt total, and nullable last HTTP status in list items. Detail should provide the event payload and destination URL. Each attempt needs `id`, `delivery_id`, `attempt_number`, `created_at`, and nullable `response_status`, `response_body`, and `error_message`. Define response body size limits and signal truncation if applied.
- **Pagination and errors.** Return `{items, next_cursor}` for paginated lists with a nullable `next_cursor`. Use timezone-aware ISO 8601 timestamps and the existing `pending`, `success`, and `failed` status values. Return `404` for unknown IDs and consistent validation error details.

## Future write operations

- Endpoint update and deactivation, event subscriptions, and endpoint-scoped test events need dedicated contracts. Public endpoint responses should expose signing configuration status without including signing secrets.
- `POST /deliveries/{delivery_id}/retry` should define which states are eligible, how duplicate requests are handled, and how retries append attempts. Define retry policy and signing-secret rotation separately.
- The backend owns destination validation and outbound request policy, including SSRF protection. The frontend validates URL syntax for form feedback.

## Browser access

The Vite development server can proxy requests to the API. For deployment, serve the API through the frontend's origin or configure the API's CORS policy to allow the dashboard origin, `GET`, `POST`, and the `Content-Type` request header. The frontend's public base URL must not contain credentials.
