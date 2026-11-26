export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export interface EventInput {
  event_type: string;
  data: JsonObject;
}

export interface EventRecord extends EventInput {
  id: number;
  created_at: string;
}

export interface EndpointInput {
  name: string;
  url: string;
}

export interface EndpointRecord extends EndpointInput {
  id: number;
  created_at: string;
}

export type DeliveryStatus = 'pending' | 'success' | 'failed';

export interface DeliveryRecord {
  id: number;
  event_id: number;
  endpoint_id: number;
  status: DeliveryStatus;
  created_at: string;
  updated_at: string;
}

export interface DeliveryAttempt {
  id: number;
  delivery_id: number;
  attempt_number: number;
  response_status: number | null;
  response_body: string | null;
  error_message: string | null;
  created_at: string;
}

export interface DemoData {
  events: EventRecord[];
  endpoints: EndpointRecord[];
  deliveries: DeliveryRecord[];
  attempts: DeliveryAttempt[];
}

export type DataMode = 'demo' | 'live';
