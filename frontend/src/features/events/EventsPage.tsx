import { useMemo, useState } from 'react'
import { ChevronRight, Plus, Radio, Send } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { ApiError } from '@/api/client'
import { useDemoData, useEvent, useEvents } from '@/api/queries'
import { usePreferences } from '@/app/preferences'
import { Button, JsonViewer, PageHeader, StatePanel, TableSkeleton } from '@/components/shared/ui'
import { formatId } from '@/lib/format'
import type { DeliveryStatus, EventRecord } from '@/types'
import { BackToRecords, CopyValue, DetailFields, EmptyRecords, MissingValue, RequestError, getRecordId } from '../RecordDetails'
import { ClearFilters, RecordsSearch, RecordsTable, TimeFilter, inTimePeriod, type TimePeriod } from '../RecordsTable'
import { DeliveryTable, getDeliveryRows } from '../deliveries/DeliveryTable'

function PlaygroundLink() {
  return <Button asChild><Link to="/playground"><Plus size={16} aria-hidden="true" />Send event</Link></Button>
}

type Outcomes = Record<DeliveryStatus, number>

const outcomeLabels: Record<DeliveryStatus, string> = { success: 'Success', failed: 'Failed', pending: 'Pending' }
const outcomesInOrder: DeliveryStatus[] = ['success', 'failed', 'pending']

function OutcomeCounts({ counts }: { counts: Outcomes }) {
  return (
    <span className="records-outcomes">
      {outcomesInOrder.filter((status) => counts[status] > 0).map((status) => (
        <span className={`records-outcome records-outcome--${status}`} key={status} title={`${counts[status]} ${outcomeLabels[status].toLowerCase()}`}>
          <span aria-hidden="true" />
          {counts[status]} <span className="sr-only">{outcomeLabels[status]}</span>
        </span>
      ))}
    </span>
  )
}

export function EventsPage() {
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState<TimePeriod>('all')
  const { mode, formatDate } = usePreferences()
  const events = useEvents()
  const demo = useDemoData()
  const summary = useMemo(() => {
    const countsByEvent = new Map<number, Outcomes>()
    if (mode === 'demo') {
      for (const delivery of demo.data?.deliveries ?? []) {
        const counts = countsByEvent.get(delivery.event_id) ?? { pending: 0, success: 0, failed: 0 }
        counts[delivery.status] += 1
        countsByEvent.set(delivery.event_id, counts)
      }
    }
    return countsByEvent
  }, [mode, demo.data])
  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    const now = Date.now()
    return (events.data ?? []).filter((event) => (
      inTimePeriod(event.created_at, period, now)
      && (!query
        || formatId('event', event.id, mode).toLowerCase().includes(query)
        || String(event.id).includes(query)
        || event.event_type.toLowerCase().includes(query))
    ))
  }, [events.data, mode, period, search])
  const columns = useMemo<ColumnDef<EventRecord>[]>(() => [
    {
      accessorKey: 'id',
      header: 'Event ID',
      cell: ({ row }) => <Link className="records-id-link" to={`/events/${row.original.id}`}>{formatId('event', row.original.id, mode)}</Link>,
    },
    {
      accessorKey: 'event_type',
      header: 'Event type',
      cell: ({ row }) => <code className="records-truncate" title={row.original.event_type}>{row.original.event_type}</code>,
    },
    {
      id: 'created_at',
      accessorFn: (event) => Date.parse(event.created_at),
      header: 'Created at',
      cell: ({ row }) => <time className="records-date" dateTime={row.original.created_at}>{formatDate(row.original.created_at)}</time>,
    },
    {
      id: 'count',
      accessorFn: (event) => {
        if (mode === 'live') return
        const counts = summary.get(event.id)
        return counts ? counts.success + counts.failed + counts.pending : 0
      },
      header: 'Deliveries',
      enableSorting: mode === 'demo',
      cell: ({ getValue }) => mode === 'demo' ? <code>{getValue<number>()}</code> : <MissingValue label="Delivery count unavailable in Live mode" />,
    },
    {
      id: 'outcome',
      header: 'Delivery outcome',
      cell: ({ row }) => {
        if (mode === 'live') return <MissingValue label="Delivery outcomes unavailable in Live mode" />
        const counts = summary.get(row.original.id)
        return counts ? <OutcomeCounts counts={counts} /> : <span className="records-muted">No deliveries</span>
      },
    },
    {
      id: 'details',
      header: () => <span className="sr-only">Details</span>,
      cell: ({ row }) => (
        <Link className="records-row-chevron" aria-label={`Open event ${row.original.id}`} to={`/events/${row.original.id}`}>
          <ChevronRight size={16} />
        </Link>
      ),
    },
  ], [formatDate, mode, summary])
  const filtering = search.trim().length > 0 || period !== 'all'

  function clearFilters() {
    setSearch('')
    setPeriod('all')
  }

  return (
    <div className="records-page">
      <PageHeader title="Events" description="Inspect incoming events and their delivery outcomes." actions={<PlaygroundLink />} />
      {events.isLoading ? <TableSkeleton rows={8} columns={5} />
        : events.isError ? <RequestError error={events.error} onRetry={() => void events.refetch()} />
        : <RecordsTable
          label="Events"
          columns={columns}
          rows={rows}
          getRowId={(row) => String(row.id)}
          initialSorting={[{ id: 'created_at', desc: true }]}
          toolbar={
            <>
              <RecordsSearch value={search} onChange={setSearch} placeholder="Search event ID or type" />
              <TimeFilter value={period} onChange={setPeriod} />
              {filtering && <ClearFilters onClick={clearFilters} />}
            </>
          }
          empty={filtering
            ? <EmptyRecords title="No matching events" description="Adjust the current filters." />
            : <EmptyRecords title="No events yet" description="Send an event from the Playground to see it here." />}
        />}
    </div>
  )
}

export function EventDetailsPage() {
  const params = useParams()
  const id = getRecordId(params.id ?? params.eventId)
  const { formatDate, mode } = usePreferences()
  const event = useEvent(id)
  const demo = useDemoData()
  const deliveries = useMemo(() => getDeliveryRows(demo.data).filter(({ delivery }) => delivery.event_id === id), [demo.data, id])
  const record = event.data
  const title = record ? formatId('event', record.id, mode) : 'Event details'
  const missing = event.error instanceof ApiError && event.error.status === 404

  return (
    <div className="records-page">
      <BackToRecords to="/events">Events</BackToRecords>
      <PageHeader title={title} description={record?.event_type} />
      {id === undefined ? <StatePanel title="Event not found" description="The event ID in this URL is invalid." icon={<Radio size={19} />} />
        : event.isLoading ? <TableSkeleton columns={3} rows={3} />
        : missing ? <StatePanel title="Event not found" description="This event does not exist in the current mode." icon={<Radio size={19} />} />
        : event.isError ? <RequestError error={event.error} onRetry={() => void event.refetch()} />
        : !record ? <StatePanel title="Event not found" description="This event does not exist in the current mode." icon={<Radio size={19} />} />
        : <>
          <DetailFields fields={[
            { label: 'Event ID', value: <CopyValue label="Copy event ID" value={String(record.id)} display={formatId('event', record.id, mode)} /> },
            { label: 'Event type', value: <code>{record.event_type}</code> },
            { label: 'Created at', value: <time dateTime={record.created_at}>{formatDate(record.created_at)}</time> },
          ]} />
          <JsonViewer title="Original payload" value={{ event_type: record.event_type, data: record.data }} />
          <section className="records-detail-section" aria-labelledby="event-deliveries">
            <h2 id="event-deliveries">Associated deliveries</h2>
            {mode === 'live'
              ? <StatePanel title="Delivery history unavailable" description="The API does not expose deliveries for events yet." icon={<Send size={19} />} />
              : demo.isLoading ? <TableSkeleton columns={5} rows={3} />
              : demo.isError ? <RequestError error={demo.error} onRetry={() => void demo.refetch()} />
              : <DeliveryTable rows={deliveries} columnsToHide={['event_id', 'event_type', 'updated_at']} empty={<EmptyRecords title="No deliveries for this event" />} />}
          </section>
        </>}
    </div>
  )
}
