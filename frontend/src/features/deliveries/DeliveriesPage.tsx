import { useMemo, useState } from 'react'
import { Check, ChevronDown, History, RotateCcw, Send, X } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { useDemoData, useLiveDeliveries } from '@/api/queries'
import { usePreferences } from '@/app/preferences'
import { Button, CopyButton, JsonViewer, PageHeader, Select, StatePanel, StatusBadge, TableSkeleton } from '@/components/shared/ui'
import { formatId } from '@/lib/format'
import type { DeliveryAttempt, DeliveryStatus, LiveDeliverySummary } from '@/types'
import { BackToRecords, CopyValue, DetailFields, EmptyRecords, MissingValue, RequestError, getRecordId } from '../RecordDetails'
import { ClearFilters, RecordsTable, TimeFilter, inTimePeriod, type TimePeriod } from '../RecordsTable'
import { DeliveryTable, getDeliveryRows } from './DeliveryTable'

interface DeliveryFilters {
  status: DeliveryStatus | ''
  endpoint: string
  type: string
  code: string
  period: TimePeriod
}

const defaultFilters: DeliveryFilters = { status: '', endpoint: '', type: '', code: '', period: 'all' }

function StatusFilter({ value, onChange }: { value: DeliveryFilters['status']; onChange: (value: DeliveryFilters['status']) => void }) {
  return (
    <Select className="records-select" aria-label="Delivery status" value={value} onChange={(event) => onChange(event.target.value as DeliveryFilters['status'])}>
      <option value="">All statuses</option>
      <option value="success">Success</option>
      <option value="failed">Failed</option>
      <option value="pending">Pending</option>
    </Select>
  )
}

function DemoDeliveries() {
  const demo = useDemoData()
  const [filters, setFilters] = useState(defaultFilters)
  const records = useMemo(() => getDeliveryRows(demo.data), [demo.data])
  const types = useMemo(() => [...new Set(demo.data?.events.map(({ event_type }) => event_type))].sort(), [demo.data])
  const codes = useMemo(() => [...new Set(records.map(({ last }) => last?.response_status ?? null))]
    .filter((code): code is number => code !== null)
    .sort((left, right) => left - right), [records])
  const rows = useMemo(() => {
    const now = Date.now()
    return records.filter(({ delivery, event, last }) => (
      (!filters.status || delivery.status === filters.status)
      && (!filters.endpoint || String(delivery.endpoint_id) === filters.endpoint)
      && (!filters.type || event?.event_type === filters.type)
      && (!filters.code || (filters.code === 'none' ? last?.response_status == null : String(last?.response_status) === filters.code))
      && inTimePeriod(delivery.created_at, filters.period, now)
    ))
  }, [filters, records])
  const filtering = filters.status || filters.endpoint || filters.type || filters.code || filters.period !== 'all'

  function updateFilter<Key extends keyof DeliveryFilters>(key: Key, value: DeliveryFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  if (demo.isLoading) return <TableSkeleton rows={8} columns={7} />
  if (demo.isError) return <RequestError error={demo.error} onRetry={() => void demo.refetch()} />

  return (
    <DeliveryTable
      rows={rows}
      toolbar={
        <>
          <StatusFilter value={filters.status} onChange={(status) => updateFilter('status', status)} />
          <Select className="records-select" aria-label="Endpoint" value={filters.endpoint} onChange={(event) => updateFilter('endpoint', event.target.value)}>
            <option value="">All endpoints</option>
            {demo.data?.endpoints.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
          </Select>
          <Select className="records-select" aria-label="Event type" value={filters.type} onChange={(event) => updateFilter('type', event.target.value)}>
            <option value="">All event types</option>
            {types.map((type) => <option key={type} value={type}>{type}</option>)}
          </Select>
          <Select className="records-select" aria-label="HTTP response code" value={filters.code} onChange={(event) => updateFilter('code', event.target.value)}>
            <option value="">All HTTP codes</option>
            {codes.map((code) => <option key={code} value={code}>{code}</option>)}
            <option value="none">No response</option>
          </Select>
          <TimeFilter value={filters.period} onChange={(period) => updateFilter('period', period)} />
          {filtering && <ClearFilters onClick={() => setFilters(defaultFilters)} />}
        </>
      }
      empty={<EmptyDeliveries filtering={!!filtering} />}
    />
  )
}

function EmptyDeliveries({ filtering }: { filtering: boolean }) {
  return filtering
    ? <EmptyRecords title="No matching deliveries" description="Adjust the current filters." />
    : <EmptyRecords title="No deliveries yet" description="Deliveries appear when Evently sends events to endpoints." />
}

function LiveDeliveries() {
  const { formatDate } = usePreferences()
  const deliveries = useLiveDeliveries()
  const [status, setStatus] = useState<DeliveryFilters['status']>('')
  const [endpoint, setEndpoint] = useState('')
  const [type, setType] = useState('')
  const [period, setPeriod] = useState<TimePeriod>('all')
  const options = useMemo(() => {
    const endpointIds = new Set<number>()
    const eventTypes = new Set<string>()
    const fields = new Set<string>(['id', 'status', 'created_at'])

    for (const row of deliveries.data ?? []) {
      if (row.endpoint_id !== undefined) endpointIds.add(row.endpoint_id)
      if (row.event_type !== undefined) eventTypes.add(row.event_type)
      for (const key of Object.keys(row)) {
        if (row[key as keyof LiveDeliverySummary] !== undefined) fields.add(key)
      }
    }

    return {
      endpointIds: [...endpointIds].sort((left, right) => left - right),
      eventTypes: [...eventTypes].sort(),
      fields,
    }
  }, [deliveries.data])
  const rows = useMemo(() => {
    const now = Date.now()
    return (deliveries.data ?? []).filter((row) => (
      (!status || row.status === status)
      && (!endpoint || String(row.endpoint_id) === endpoint)
      && (!type || row.event_type === type)
      && inTimePeriod(row.created_at, period, now)
    ))
  }, [deliveries.data, endpoint, period, status, type])
  const columns = useMemo<ColumnDef<LiveDeliverySummary>[]>(() => [
    {
      id: 'id',
      accessorKey: 'id',
      header: 'Delivery ID',
      cell: ({ row }) => <CopyValue label="Copy delivery ID" value={String(row.original.id)} />,
    },
    {
      id: 'event_id',
      accessorKey: 'event_id',
      header: 'Event ID',
      cell: ({ row }) => row.original.event_id === undefined ? <MissingValue /> : (
        <Link className="records-id-link" to={`/events/${row.original.event_id}`}>{row.original.event_id}</Link>
      ),
    },
    {
      id: 'event_type',
      accessorKey: 'event_type',
      header: 'Event type',
      cell: ({ row }) => row.original.event_type === undefined
        ? <MissingValue />
        : <code className="records-truncate" title={row.original.event_type}>{row.original.event_type}</code>,
    },
    {
      id: 'endpoint_id',
      accessorKey: 'endpoint_id',
      header: 'Endpoint ID',
      cell: ({ row }) => row.original.endpoint_id === undefined ? <MissingValue /> : <code>{row.original.endpoint_id}</code>,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'attempts',
      accessorFn: ({ attempts }) => Array.isArray(attempts) ? attempts.length : attempts,
      header: 'Attempts',
      cell: ({ getValue }) => {
        const count = getValue<number | undefined>()
        return count === undefined ? <MissingValue /> : <code>{count}</code>
      },
    },
    {
      id: 'created_at',
      header: 'Created at',
      accessorFn: (delivery) => Date.parse(delivery.created_at),
      cell: ({ row }) => <time className="records-date" dateTime={row.original.created_at}>{formatDate(row.original.created_at)}</time>,
    },
    {
      id: 'updated_at',
      accessorFn: ({ updated_at }) => updated_at === undefined ? undefined : Date.parse(updated_at),
      header: 'Updated at',
      cell: ({ row }) => row.original.updated_at === undefined
        ? <MissingValue />
        : <time className="records-date" dateTime={row.original.updated_at}>{formatDate(row.original.updated_at)}</time>,
    },
  ], [formatDate])
  const filtering = status !== '' || endpoint !== '' || type !== '' || period !== 'all'

  function clearFilters() {
    setStatus('')
    setEndpoint('')
    setType('')
    setPeriod('all')
  }

  if (deliveries.isLoading) return <TableSkeleton rows={8} columns={3} />
  if (deliveries.isError) return <RequestError error={deliveries.error} onRetry={() => void deliveries.refetch()} />

  return (
    <RecordsTable
      label="Deliveries"
      rows={rows}
      columns={columns.filter(({ id }) => id && options.fields.has(id))}
      getRowId={(row) => String(row.id)}
      initialSorting={[{ id: 'created_at', desc: true }]}
      toolbar={
        <>
          <StatusFilter value={status} onChange={setStatus} />
          {options.endpointIds.length > 0 && (
            <Select className="records-select" aria-label="Endpoint ID" value={endpoint} onChange={(event) => setEndpoint(event.target.value)}>
              <option value="">All endpoints</option>
              {options.endpointIds.map((id) => <option key={id} value={id}>{id}</option>)}
            </Select>
          )}
          {options.eventTypes.length > 0 && (
            <Select className="records-select" aria-label="Event type" value={type} onChange={(event) => setType(event.target.value)}>
              <option value="">All event types</option>
              {options.eventTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </Select>
          )}
          <TimeFilter value={period} onChange={setPeriod} />
          {filtering && <ClearFilters onClick={clearFilters} />}
        </>
      }
      empty={<EmptyDeliveries filtering={filtering} />}
    />
  )
}

export function DeliveriesPage() {
  const { mode } = usePreferences()

  return (
    <div className="records-page">
      <PageHeader title="Deliveries" description={mode === 'demo' ? 'Trace webhook requests and inspect their HTTP responses.' : 'Inspect delivery records returned by the Evently API.'} />
      {mode === 'live' ? <LiveDeliveries /> : <DemoDeliveries />}
    </div>
  )
}

function AttemptTimeline({ attempts }: { attempts: DeliveryAttempt[] }) {
  const { formatDate } = usePreferences()
  const ordered = [...attempts].sort((left, right) => right.attempt_number - left.attempt_number)

  if (ordered.length === 0) {
    return <StatePanel title="No attempts yet" description="Attempts appear here after Evently contacts the destination." icon={<History size={19} />} />
  }

  return (
    <ol className="records-timeline">
      {ordered.map((attempt, index) => {
        const code = attempt.response_status
        const successful = !attempt.error_message && code !== null && code >= 200 && code < 300
        return (
          <li key={attempt.id} className={`records-attempt records-attempt--${successful ? 'success' : 'failed'}`}>
            <span className="records-attempt-marker" aria-hidden="true">{successful ? <Check size={13} /> : <X size={13} />}</span>
            <details className="records-attempt-card" open={index === 0}>
              <summary>
                <span className="records-attempt-title">Attempt {attempt.attempt_number}</span>
                <StatusBadge status={successful ? 'success' : 'failed'} />
                <code>{code ?? 'No response'}</code>
                <time className="records-date" dateTime={attempt.created_at}>{formatDate(attempt.created_at)}</time>
                <ChevronDown className="records-attempt-chevron" size={16} aria-hidden="true" />
              </summary>
              <div className="records-attempt-content">
                {attempt.error_message && (
                  <div>
                    <div className="records-output-label">Error message</div>
                    <pre className="records-attempt-error">{attempt.error_message}</pre>
                  </div>
                )}
                <div>
                  <div className="records-output-label">
                    Response body
                    {attempt.response_body !== null && <CopyButton label="Copy response body" value={attempt.response_body} />}
                  </div>
                  {attempt.response_body
                    ? <pre className="records-response" tabIndex={0} aria-label="Response body">{attempt.response_body}</pre>
                    : <p className="records-output-empty">{attempt.response_body === '' ? 'Empty response body' : 'No response body recorded'}</p>}
                </div>
              </div>
            </details>
          </li>
        )
      })}
    </ol>
  )
}

export function DeliveryDetailsPage() {
  const params = useParams()
  const id = getRecordId(params.id ?? params.deliveryId)
  const { mode, formatDate } = usePreferences()
  const demo = useDemoData()
  const row = useMemo(() => mode === 'demo' ? getDeliveryRows(demo.data).find(({ delivery }) => delivery.id === id) : undefined, [demo.data, id, mode])

  return (
    <div className="records-page">
      <BackToRecords to="/deliveries">Deliveries</BackToRecords>
      <PageHeader title={row ? formatId('delivery', row.delivery.id, mode) : 'Delivery details'} actions={row && (
        <Button disabled title="Retry requires a backend API"><RotateCcw size={15} aria-hidden="true" />Retry delivery</Button>
      )} />
      {id === undefined ? <StatePanel title="Delivery not found" description="The delivery ID in this URL is invalid." icon={<Send size={19} />} />
        : mode === 'live' ? <StatePanel title="Delivery details unavailable" description="The API does not expose individual deliveries or their attempts yet." icon={<Send size={19} />} />
        : demo.isLoading ? <TableSkeleton columns={4} rows={4} />
        : demo.isError ? <RequestError error={demo.error} onRetry={() => void demo.refetch()} />
        : !row ? <StatePanel title="Delivery not found" description="This delivery does not exist in the demo dataset." icon={<Send size={19} />} />
        : <>
          <DetailFields fields={[
            { label: 'Delivery ID', value: <CopyValue value={String(row.delivery.id)} display={formatId('delivery', row.delivery.id, mode)} label="Copy delivery ID" /> },
            { label: 'Status', value: <StatusBadge status={row.delivery.status} /> },
            { label: 'Last HTTP code', value: row.last?.response_status == null ? <MissingValue label="No HTTP response" /> : <code>{row.last.response_status}</code> },
            { label: 'Event', value: <Link className="records-id-link" to={`/events/${row.delivery.event_id}`}>{formatId('event', row.delivery.event_id, mode)}</Link> },
            { label: 'Event type', value: row.event ? <code>{row.event.event_type}</code> : <MissingValue /> },
            { label: 'Endpoint', value: <Link className="records-name-link" to={`/endpoints/${row.delivery.endpoint_id}`}>{row.endpoint?.name ?? formatId('endpoint', row.delivery.endpoint_id, mode)}</Link> },
            { label: 'Created at', value: <time dateTime={row.delivery.created_at}>{formatDate(row.delivery.created_at)}</time> },
            { label: 'Updated at', value: <time dateTime={row.delivery.updated_at}>{formatDate(row.delivery.updated_at)}</time> },
            { label: 'Destination URL', value: row.endpoint ? <CopyValue value={row.endpoint.url} label="Copy destination URL" /> : <MissingValue /> },
          ]} />
          <section className="records-detail-section" aria-labelledby="delivery-attempts">
            <h2 id="delivery-attempts">Attempt history <span className="records-section-count">{row.attempts.length}</span></h2>
            <AttemptTimeline attempts={row.attempts} />
          </section>
          {row.event && <JsonViewer title="Original payload" value={{ event_type: row.event.event_type, data: row.event.data }} />}
        </>}
    </div>
  )
}
