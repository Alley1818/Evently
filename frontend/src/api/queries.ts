import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePreferences } from '@/app/preferences';
import { addDemoEndpoint, addDemoEvent, getDemoData } from '@/mocks/demo';
import type { DataMode, EndpointInput, EventInput, EventRecord } from '@/types';
import { ApiError, api, type ApiResponse } from './client';

const demoKey = ['demo', 'data'] as const;
const liveDeliveriesKey = ['live', 'deliveries'] as const;
const eventsKey = (mode: DataMode) => [mode, 'events'] as const;

export function useDemoData() {
  const { mode } = usePreferences();
  return useQuery({ queryKey: demoKey, queryFn: getDemoData, enabled: mode === 'demo' });
}

export function useEvents() {
  const { mode } = usePreferences();
  return useQuery({
    queryKey: eventsKey(mode),
    queryFn: async ({ signal }) => mode === 'demo' ? getDemoData().events : (await api.listEvents(signal)).data,
  });
}

export function useEvent(id: number | undefined) {
  const { mode } = usePreferences();
  return useQuery({
    queryKey: [...eventsKey(mode), id],
    enabled: id !== undefined,
    queryFn: async ({ signal }) => {
      if (id === undefined) throw new ApiError('Event not found.');
      if (mode === 'live') return (await api.getEvent(id, signal)).data;
      const event = getDemoData().events.find((record) => record.id === id);
      if (!event) throw new ApiError('Event not found.');
      return event;
    },
  });
}

export function useLiveDeliveries() {
  const { mode } = usePreferences();
  return useQuery({
    queryKey: liveDeliveriesKey,
    queryFn: async ({ signal }) => (await api.listDeliveries(signal)).data,
    enabled: mode === 'live',
  });
}

export function useCreateEvent() {
  const { mode } = usePreferences();
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [mode, 'create-event'],
    mutationFn: async (input: EventInput): Promise<ApiResponse<EventRecord>> => {
      if (mode === 'live') return api.createEvent(input);
      const started = performance.now();
      const data = addDemoEvent(input);
      return {
        data,
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        durationMs: Math.round(performance.now() - started),
        body: JSON.stringify(data, null, 2),
      };
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: eventsKey(mode) }),
        queryClient.invalidateQueries({ queryKey: mode === 'demo' ? demoKey : liveDeliveriesKey }),
      ]);
    },
  });
}

export function useCreateEndpoint() {
  const { mode } = usePreferences();
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [mode, 'create-endpoint'],
    mutationFn: async (input: EndpointInput) => mode === 'demo'
      ? addDemoEndpoint(input)
      : (await api.createEndpoint(input)).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [mode, 'endpoints'] });
      if (mode === 'demo') await queryClient.invalidateQueries({ queryKey: demoKey });
    },
  });
}
