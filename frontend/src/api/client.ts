import type { EndpointInput, EndpointRecord, EventInput, EventRecord, LiveDeliverySummary } from '@/types';

const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');
export const apiDocsUrl = `${baseUrl}/docs`;

export interface ApiResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  durationMs: number;
  body: string;
}

type ResponseInfo = Omit<ApiResponse<unknown>, 'data'>;

export class ApiError extends Error {
  readonly status?: number;
  readonly statusText?: string;
  readonly headers?: Record<string, string>;
  readonly durationMs?: number;
  readonly body?: string;

  constructor(message: string, info?: ResponseInfo) {
    super(message);
    this.name = 'ApiError';
    this.status = info?.status;
    this.statusText = info?.statusText;
    this.headers = info?.headers;
    this.durationMs = info?.durationMs;
    this.body = info?.body;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return isObject(value)
    && Number.isSafeInteger(value.id)
    && typeof value.created_at === 'string';
}

function isEvent(value: unknown): value is EventRecord {
  return isRecord(value) && typeof value.event_type === 'string' && isObject(value.data);
}

function isEndpoint(value: unknown): value is EndpointRecord {
  return isRecord(value) && typeof value.name === 'string' && typeof value.url === 'string';
}

function isDeliverySummary(value: unknown): value is LiveDeliverySummary {
  if (!isRecord(value)) return false;
  const { status, event_id, endpoint_id, updated_at } = value;
  return (status === 'pending' || status === 'success' || status === 'failed')
    && Number.isSafeInteger(event_id)
    && Number.isSafeInteger(endpoint_id)
    && typeof updated_at === 'string';
}

function errorMessage(data: unknown, status: number) {
  if (isObject(data)) {
    if (typeof data.detail === 'string' && data.detail) return data.detail;
    if (Array.isArray(data.detail)) {
      const messages = data.detail.flatMap((issue: unknown) => {
        if (!isObject(issue) || typeof issue.msg !== 'string') return [];
        const field = Array.isArray(issue.loc) ? issue.loc.slice(1).join('.') : '';
        return field ? `${field}: ${issue.msg}` : issue.msg;
      });
      if (messages.length) return messages.join(' · ');
    }
  }
  if (status === 502 || status === 503 || status === 504) {
    return `Could not connect to the Evently API (HTTP ${status}). Check that the backend is running.`;
  }
  return `Evently API returned HTTP ${status}.`;
}

async function request<T>(
  path: string,
  isExpected: (value: unknown) => value is T,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  const started = performance.now();
  let response: Response;
  let body: string;
  try {
    response = await fetch(`${baseUrl}${path}`, options);
    body = await response.text();
  } catch (error) {
    if (options?.signal?.aborted) throw error;
    throw new ApiError('Could not connect to the Evently API. Check that the backend is running and reachable.');
  }
  const info = {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers),
    durationMs: Math.round(performance.now() - started),
    body,
  };

  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    if (response.ok) throw new ApiError('The Evently API returned an invalid JSON response.', info);
  }
  if (!response.ok) throw new ApiError(errorMessage(data, info.status), info);
  if (!isExpected(data)) throw new ApiError('The Evently API returned an unexpected response format.', info);

  return { ...info, data };
}

export const api = {
  listEvents: (signal?: AbortSignal) => request(
    '/events',
    (value): value is EventRecord[] => Array.isArray(value) && value.every(isEvent),
    { signal },
  ),
  getEvent: (id: number, signal?: AbortSignal) => request(`/events/${id}`, isEvent, { signal }),
  listDeliveries: (signal?: AbortSignal) => request(
    '/deliveries',
    (value): value is LiveDeliverySummary[] => Array.isArray(value) && value.every(isDeliverySummary),
    { signal },
  ),
  createEvent: (input: EventInput) => request('/events', isEvent, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }),
  createEndpoint: (input: EndpointInput) => request(
    `/endpoints?${new URLSearchParams({ name: input.name, url: input.url })}`,
    isEndpoint,
    { method: 'POST' },
  ),
};
