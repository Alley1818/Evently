import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { usePreferences } from '@/app/preferences'
import { StatusBadge } from '@/components/shared/ui'
import type { DeliveryRecord } from '@/types'
import { MissingValue } from '../RecordDetails'
import { RecordsTable } from '../RecordsTable'

export function LiveDeliveryTable({
  rows,
  toolbar,
  empty,
  showEvent = true,
  eventTypes,
}: {
  rows: DeliveryRecord[]
  toolbar?: ReactNode
  empty: ReactNode
  showEvent?: boolean
  eventTypes?: ReadonlyMap<number, string>
}) {
  const { formatDate } = usePreferences()
  const columns = useMemo<ColumnDef<DeliveryRecord>[]>(() => [
    {
      accessorKey: 'id',
      header: 'Delivery ID',
      cell: ({ row }) => <Link className="records-id-link" to={`/deliveries/${row.original.id}`}>{row.original.id}</Link>,
    },
    {
      id: 'event_id',
      accessorKey: 'event_id',
      header: 'Event ID',
      cell: ({ row }) => (
        <Link className="records-id-link" to={`/events/${row.original.event_id}`}>{row.original.event_id}</Link>
      ),
    },
    {
      id: 'event_type',
      header: 'Event type',
      accessorFn: ({ event_id }) => eventTypes?.get(event_id),
      cell: ({ getValue }) => {
        const type = getValue<string | undefined>()
        return type ? <code className="records-truncate" title={type}>{type}</code> : <MissingValue />
      },
    },
    {
      accessorKey: 'endpoint_id',
      header: 'Endpoint ID',
      cell: ({ row }) => <code>{row.original.endpoint_id}</code>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'created_at',
      header: 'Created at',
      accessorFn: ({ created_at }) => Date.parse(created_at),
      cell: ({ row }) => <time className="records-date" dateTime={row.original.created_at}>{formatDate(row.original.created_at)}</time>,
    },
    {
      id: 'updated_at',
      accessorFn: ({ updated_at }) => Date.parse(updated_at),
      header: 'Updated at',
      cell: ({ row }) => <time className="records-date" dateTime={row.original.updated_at}>{formatDate(row.original.updated_at)}</time>,
    },
  ], [eventTypes, formatDate])

  return (
    <RecordsTable
      label="Deliveries"
      rows={rows}
      columns={columns.filter(({ id }) => {
        if (id === 'event_id') return showEvent
        if (id === 'event_type') return !!eventTypes?.size
        return true
      })}
      getRowId={(row) => String(row.id)}
      initialSorting={[{ id: 'created_at', desc: true }]}
      toolbar={toolbar}
      empty={empty}
    />
  )
}
