import type { DataMode, DeliveryAttempt } from '@/types';

const prefixes = { event: 'evt', endpoint: 'ep', delivery: 'dlv' };

export function formatId(kind: keyof typeof prefixes, id: number, mode: DataMode) {
  if (mode === 'live') return String(id);
  return `${prefixes[kind]}_${String(id).padStart(5, '0')}`;
}

export function latestAttempt(attempts: DeliveryAttempt[]) {
  return attempts.reduce<DeliveryAttempt | undefined>(
    (latest, attempt) => !latest || attempt.attempt_number > latest.attempt_number ? attempt : latest,
    undefined,
  );
}
