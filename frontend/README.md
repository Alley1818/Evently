# Evently Dashboard

Evently's developer dashboard for incoming events, webhook endpoints, delivery attempts, and publishing test events.

## Run locally

Use Node.js `20.19+` on Node 20, or `22.12+` on Node 22 and newer.

```bash
cd frontend
npm ci
npm run dev
```

Open the local address printed by Vite. On first use the dashboard opens in Demo mode with linked sample data and simulated operations. Use the mode selector to switch to Live. Theme, date format, timezone, table density, and mode are browser-local preferences.

## Connect the Live API

The default development proxy sends `/api/*` to `http://localhost:8000`. The sidebar's API Docs link opens FastAPI's Swagger UI through the same proxy.

Copy `.env.example` to `.env.local` to override configuration. Set `API_PROXY_TARGET` to change the development proxy target. Set `VITE_API_BASE_URL` to use a browser-accessible API URL directly. For production builds, set that URL before building or configure the deployment gateway to route `/api/*` to FastAPI and `/openapi.json` to the Swagger schema. Serve `index.html` for dashboard routes such as `/events/123` and `/deliveries/456`. A separate API origin needs CORS for the dashboard origin.

For a local backend with the current startup defects resolved, run the following commands from the repository root.

```bash
docker compose up -d db
uv run alembic upgrade head
uv run --with uvicorn uvicorn main:app --port 8000
```

In Live mode, the dashboard requests event history and delivery summaries, and sends endpoint and event creation requests to the configured API. Publishing an event sends it to every registered endpoint. API errors stay visible in Live mode. Overview analytics, endpoint listing, and delivery details and attempts require additional APIs. Review the [API requirements](../API_REQUIREMENTS.md) for the existing route contracts, current backend defects, and proposed routes.

## Verify and build

```bash
npm run typecheck
npm run build
npm run preview
```

The production build is written to `dist/`.
