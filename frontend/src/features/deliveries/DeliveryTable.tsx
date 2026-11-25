import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { usePreferences } from '@/app/preferences'
import { StatusBadge } from '@/components/shared/ui'
import { formatId, latestAttempt } from '@/lib/format'
import type { DeliveryAttempt, DeliveryRecord, DemoData, EndpointRecord, EventRecord } from '@/types'
import { MissingValue } from '../RecordDetails'
import { RecordsTable } from '../RecordsTable'

export interface DeliveryRow {
  delivery: DeliveryRecord
  event?: EventRecord
  endpoint?: EndpointRecord
  attempts: DeliveryAttempt[]
  last?: DeliveryAttempt | null
}

export function getDeliveryRows(data: DemoData | undefined): DeliveryRow[] {
  if (!data) return []
  const events = new Map(data.events.map((event) => [event.id, event]))
  const endpoints = new Map(data.endpoints.map((endpoint) => [endpoint.id, endpoint]))
  const attemptsByDelivery = new Map<number, DeliveryAttempt[]>()

  for (const attempt of data.attempts) {
    const attempts = attemptsByDelivery.get(attempt.delivery_id)
    if (attempts) attempts.push(attempt)
    else attemptsByDelivery.set(attempt.delivery_id, [attempt])
  }

  return data.deliveries.map((delivery) => {
    const attempts = attemptsByDelivery.get(delivery.id) ?? []
    return {
      delivery,
      event: events.get(delivery.event_id),
      endpoint: endpoints.get(delivery.endpoint_id),
      attempts,
      last: latestAttempt(attempts),
    }
  })
}

export function DeliveryTable({
  rows,
  toolbar,
  empty,
  columnsToHide = [],
  pageSize,
}: {
  rows: DeliveryRow[]
  toolbar?: ReactNode
  empty: ReactNode
  columnsToHide?: string[]
  pageSize?: number
}) {
  const { formatDate, mode } = usePreferences()
  const columns = useMemo<ColumnDef<DeliveryRow>[]>(() => [
    {
      id: 'delivery_id',
      header: 'Delivery ID',
      accessorFn: ({ delivery }) => delivery.id,
      cell: ({ row }) => (
        <Link className="records-id-link" to={`/deliveries/${row.original.delivery.id}`}>
          {formatId('delivery', row.original.delivery.id, mode)}
        </Link>
      ),
    },
    {
      id: 'event_id',
      header: 'Event ID',
      accessorFn: ({ delivery }) => delivery.event_id,
      cell: ({ row }) => (
        <Link className="records-id-link" to={`/events/${row.original.delivery.event_id}`}>
          {formatId('event', row.original.delivery.event_id, mode)}
        </Link>
      ),
    },
    {
      id: 'event_type',
      header: 'Event type',
      accessorFn: ({ event }) => event?.event_type,
      cell: ({ row }) => row.original.event ? <code className="records-truncate" title={row.original.event.event_type}>{row.original.event.event_type}</code> : <MissingValue />,
    },
    {
      id: 'endpoint',
      header: 'Endpoint',
      accessorFn: ({ endpoint }) => endpoint?.name,
      cell: ({ row }) => {
        const { endpoint } = row.original
        return endpoint ? (
          <Link className="records-name-link records-truncate" to={`/endpoints/${endpoint.id}`} title={endpoint.name}>{endpoint.name}</Link>
        ) : <MissingValue />
      },
    },
    {
      id: 'status',
      header: 'Status',
      accessorFn: ({ delivery }) => delivery.status,
      cell: ({ row }) => <StatusBadge status={row.original.delivery.status} />,
    },
    {
      id: 'response_status',
      header: 'HTTP code',
      accessorFn: ({ last }) => last?.response_status ?? undefined,
      cell: ({ row }) => row.original.last?.response_status == null ? <MissingValue label="No HTTP response" /> : <code>{row.original.last.response_status}</code>,
    },
    {
      id: 'attempts',
      header: 'Attempts',
      accessorFn: ({ attempts }) => attempts.length,
      cell: ({ getValue }) => <code>{getValue<number>()}</code>,
    },
    {
      id: 'created_at',
      header: 'Created at',
      accessorFn: ({ delivery }) => Date.parse(delivery.created_at),
      cell: ({ row }) => <time className="records-date" dateTime={row.original.delivery.created_at}>{formatDate(row.original.delivery.created_at)}</time>,
    },
    {
      id: 'updated_at',
      header: 'Updated at',
      accessorFn: ({ delivery }) => Date.parse(delivery.updated_at),
      cell: ({ row }) => <time className="records-date" dateTime={row.original.delivery.updated_at}>{formatDate(row.original.delivery.updated_at)}</time>,
    },
  ], [formatDate, mode])

  return (
    <RecordsTable
      label="Deliveries"
      rows={rows}
      getRowId={({ delivery }) => String(delivery.id)}
      columns={columns.filter(({ id }) => !id || !columnsToHide.includes(id))}
      toolbar={toolbar}
      empty={empty}
      initialSorting={[{ id: 'created_at', desc: true }]}
      pageSize={pageSize}
    />
  )
}
