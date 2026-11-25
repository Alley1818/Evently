import type { DeliveryAttempt, DeliveryRecord, DemoData, EndpointInput, EventInput, EventRecord } from '@/types';

const minute = 60_000;
const hour = 60 * minute;
const day = 24 * hour;
const now = Date.now();
const iso = (time: number) => new Date(time).toISOString();

const destinations = [
  ['billing-service', 'billing'],
  ['orders-worker', 'orders'],
  ['notifications', 'notify'],
  ['analytics', 'analytics'],
  ['customer-sync', 'customers'],
  ['subscription-worker', 'subscriptions'],
];

const samples: EventInput[] = [
  { event_type: 'order.paid', data: { order_id: 123, amount: 5000, currency: 'KZT' } },
  { event_type: 'user.registered', data: { user_id: 82, source: 'signup' } },
  { event_type: 'payment.failed', data: { payment_id: 481, reason: 'card_declined' } },
  { event_type: 'subscription.created', data: { subscription_id: 317, plan: 'monthly' } },
  { event_type: 'order.created', data: { order_id: 278, items: [{ sku: 'BOX-01', quantity: 2 }] } },
];

function createSeed(): DemoData {
  const demo: DemoData = {
    endpoints: destinations.map(([name, host], index) => ({
      id: index + 1,
      name,
      url: `https://${host}.example.com/webhooks/evently`,
      created_at: iso(now - (65 - index * 5) * day),
    })),
    events: [],
    deliveries: [],
    attempts: [],
  };

  const times = [2, 3, 5, 8, 13, 17, 23, 29, 37, 46, 55].map((age) => now - age * minute);
  const hourlyCounts = [11, 9, 12, 7, 6, 10, 15, 13, 8, 6, 10, 14, 11, 7, 6, 9, 12, 9, 5, 7, 11, 8, 6];
  hourlyCounts.forEach((count, index) => {
    for (let offset = 0; offset < count; offset++) {
      times.push(now - ((index + 1) * hour + (offset + 1) * hour / (count + 1)));
    }
  });
  for (let age = 1; age < 30; age++) {
    const count = 9 + (age * 17) % 31;
    for (let offset = 0; offset < count; offset++) {
      times.push(now - (age * day + (offset + 1) * day / (count + 1)));
    }
  }

  let deliveryId = 8000;
  let attemptId = 12000;
  times.sort((first, second) => first - second).forEach((time, index) => {
    const event: EventRecord = {
      ...samples[index % samples.length],
      id: 2000 + index,
      created_at: iso(time),
    };
    demo.events.push(event);
    demo.endpoints.forEach((endpoint) => {
      const id = ++deliveryId;
      const created = Math.min(now - 10_000, time + ((index * 19 + endpoint.id * 23) % 120) * 1000);
      const selector = (index * 53 + endpoint.id * 29 + Math.floor(index / 3) * 11) % 137;
      const failing = selector < (endpoint.id === 4 ? 23 : 8);
      const pending = now - time < 18 * minute && selector % 7 === 0;
      const recovered = !failing && selector % 29 === 0;
      const status = pending ? 'pending' : failing ? 'failed' : 'success';
      const responseAt = Math.min(now, created + 2400);
      const delivery: DeliveryRecord = {
        id,
        event_id: event.id,
        endpoint_id: endpoint.id,
        status,
        created_at: iso(created),
        updated_at: iso(pending ? created : responseAt),
      };
      demo.deliveries.push(delivery);
      if (pending) return;

      const networkFailure = failing && selector % 3 === 0;
      const count = recovered ? 2 : failing && selector % 2 === 0 ? 3 : 1;
      for (let attempt = 1; attempt <= count; attempt++) {
        const success = status === 'success' && attempt === count;
        const code = success ? (selector % 11 === 0 ? 204 : 200) : networkFailure ? null : (selector % 2 ? 503 : 502);
        demo.attempts.push({
          id: ++attemptId,
          delivery_id: id,
          attempt_number: attempt,
          response_status: code,
          response_body: code === 204 || code === null
            ? null
            : JSON.stringify(success ? { received: true } : { error: 'Upstream service unavailable' }),
          error_message: success ? null : networkFailure ? 'The destination timed out.' : `Destination returned HTTP ${code}.`,
          created_at: iso(created + Math.round((responseAt - created) * attempt / count)),
        });
      }
    });
  });
  return demo;
}

let store = createSeed();

export function getDemoData() {
  return store;
}

export function addDemoEvent(input: EventInput) {
  const created = new Date().toISOString();
  const id = (store.events.at(-1)?.id ?? 2000) + 1;
  const event = { ...input, id, created_at: created };
  const previousDelivery = store.deliveries.at(-1)?.id ?? 8000;
  const previousAttempt = store.attempts.at(-1)?.id ?? 12000;
  const deliveries = store.endpoints.map<DeliveryRecord>((endpoint, index) => ({
    id: previousDelivery + index + 1, event_id: id, endpoint_id: endpoint.id,
    status: 'success', created_at: created, updated_at: created,
  }));
  const attempts = deliveries.map<DeliveryAttempt>((delivery, index) => ({
    id: previousAttempt + index + 1, delivery_id: delivery.id, attempt_number: 1,
    response_status: 200, response_body: '{"received":true}', error_message: null, created_at: created,
  }));
  store = {
    ...store,
    events: [...store.events, event],
    deliveries: [...store.deliveries, ...deliveries],
    attempts: [...store.attempts, ...attempts],
  };
  return event;
}

export function addDemoEndpoint(input: EndpointInput) {
  const endpoint = {
    ...input,
    id: (store.endpoints.at(-1)?.id ?? 0) + 1,
    created_at: new Date().toISOString(),
  };
  store = { ...store, endpoints: [...store.endpoints, endpoint] };
  return endpoint;
}
