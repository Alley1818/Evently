import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { CheckCircle2, ChevronRight, Plus, Webhook, X } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import type { ColumnDef } from '@tanstack/react-table'
import { useCreateEndpoint, useDemoData } from '@/api/queries'
import { usePreferences } from '@/app/preferences'
import { Button, CopyButton, Input, PageHeader, StatePanel, TableSkeleton } from '@/components/shared/ui'
import { formatId } from '@/lib/format'
import type { EndpointRecord } from '@/types'
import { BackToRecords, CopyValue, DetailFields, EmptyRecords, MissingValue, RequestError, getRecordId } from '../RecordDetails'
import { RecordsSearch, RecordsTable } from '../RecordsTable'
import { DeliveryTable, getDeliveryRows } from '../deliveries/DeliveryTable'

const NAME_MAX_LENGTH = 50
const URL_MAX_LENGTH = 2048

function validateEndpointUrl(value: string) {
  if (!value) return 'Enter a destination URL.'
  if (value.length > URL_MAX_LENGTH) return `Use ${URL_MAX_LENGTH} characters or fewer.`
  try {
    const url = new URL(value)
    if (url.hostname && (url.protocol === 'http:' || url.protocol === 'https:')) return undefined
  } catch {
    return 'Enter a valid HTTP or HTTPS URL.'
  }
  return 'Enter a valid HTTP or HTTPS URL.'
}

function AddEndpointDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (endpoint: EndpointRecord) => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const create = useCreateEndpoint()
  const cleanName = name.trim()
  const cleanUrl = url.trim()
  const nameError = !cleanName ? 'Enter an endpoint name.' : cleanName.length > NAME_MAX_LENGTH ? `Use ${NAME_MAX_LENGTH} characters or fewer.` : undefined
  const urlError = validateEndpointUrl(cleanUrl)

  useEffect(() => {
    if (dialog.current && !dialog.current.open) dialog.current.showModal()
  }, [])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    if (nameError || urlError || create.isPending) return
    create.mutate({ name: cleanName, url: cleanUrl }, {
      onSuccess: (endpoint) => {
        onCreated(endpoint)
        dialog.current?.close()
      },
    })
  }

  return (
    <dialog className="records-dialog" ref={dialog} onClose={onClose} aria-labelledby="add-endpoint-title" onCancel={(event) => {
      if (create.isPending) event.preventDefault()
    }}>
      <form onSubmit={submit} noValidate>
        <div className="records-dialog-header">
          <h2 id="add-endpoint-title">Add endpoint</h2>
          <Button variant="ghost" size="icon" aria-label="Close dialog" disabled={create.isPending} onClick={() => dialog.current?.close()}>
            <X size={18} />
          </Button>
        </div>
        <div className="records-dialog-body">
          <div className="records-form-field">
            <label htmlFor="endpoint-name">Name</label>
            <Input id="endpoint-name" placeholder="Billing service" autoFocus value={name} onChange={(event) => setName(event.target.value)} disabled={create.isPending} aria-invalid={submitted && !!nameError} aria-describedby={submitted && nameError ? 'endpoint-name-error' : undefined} />
            {submitted && nameError && <span className="records-field-error" id="endpoint-name-error">{nameError}</span>}
          </div>
          <div className="records-form-field">
            <label htmlFor="endpoint-url">Destination URL</label>
            <Input id="endpoint-url" type="url" placeholder="https://example.com/webhooks" value={url} onChange={(event) => setUrl(event.target.value)} disabled={create.isPending} aria-invalid={submitted && !!urlError} aria-describedby={submitted && urlError ? 'endpoint-url-error' : undefined} />
            {submitted && urlError && <span className="records-field-error" id="endpoint-url-error">{urlError}</span>}
          </div>
          {create.isError && <p className="records-field-error" role="alert">{create.error.message}</p>}
        </div>
        <div className="records-dialog-footer">
          <Button variant="secondary" disabled={create.isPending} onClick={() => dialog.current?.close()}>Cancel</Button>
          <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Adding endpoint…' : 'Add endpoint'}</Button>
        </div>
      </form>
    </dialog>
  )
}

export function EndpointsPage() {
  const [showDialog, setShowDialog] = useState(false)
  const [search, setSearch] = useState('')
  const [created, setCreated] = useState<{ mode: 'demo' | 'live'; endpoint: EndpointRecord }>()
  const { mode, formatDate } = usePreferences()
  const demo = useDemoData()
  const success = created?.mode === mode ? created.endpoint : undefined
  const rows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return (demo.data?.endpoints ?? []).filter((endpoint) => !query
      || endpoint.name.toLowerCase().includes(query)
      || endpoint.url.toLowerCase().includes(query)
      || formatId('endpoint', endpoint.id, mode).toLowerCase().includes(query))
  }, [demo.data, mode, search])
  const stats = useMemo(() => {
    const byEndpoint = new Map<number, { total: number; delivered: number }>()
    for (const delivery of demo.data?.deliveries ?? []) {
      const counts = byEndpoint.get(delivery.endpoint_id) ?? { total: 0, delivered: 0 }
      counts.total += 1
      if (delivery.status === 'success') counts.delivered += 1
      byEndpoint.set(delivery.endpoint_id, counts)
    }
    return byEndpoint
  }, [demo.data])
  const columns = useMemo<ColumnDef<EndpointRecord>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Endpoint name',
      cell: ({ row }) => <Link className="records-name-link records-truncate" to={`/endpoints/${row.original.id}`} title={row.original.name}>{row.original.name}</Link>,
    },
    {
      accessorKey: 'id',
      header: 'Endpoint ID',
      cell: ({ row }) => <Link className="records-id-link" to={`/endpoints/${row.original.id}`}>{formatId('endpoint', row.original.id, mode)}</Link>,
    },
    {
      accessorKey: 'url',
      header: 'Destination URL',
      enableSorting: false,
      cell: ({ row }) => (
        <span className="records-url-cell">
          <code className="records-truncate" title={row.original.url}>{row.original.url}</code>
          <CopyButton value={row.original.url} label={`Copy URL for ${row.original.name}`} />
        </span>
      ),
    },
    {
      id: 'created_at',
      header: 'Created at',
      accessorFn: (endpoint) => Date.parse(endpoint.created_at),
      cell: ({ row }) => <time className="records-date" dateTime={row.original.created_at}>{formatDate(row.original.created_at)}</time>,
    },
    {
      id: 'statistics',
      header: 'Successful deliveries',
      cell: ({ row }) => {
        const counts = stats.get(row.original.id)
        return counts ? <code>{counts.delivered} / {counts.total}</code> : <MissingValue label="No deliveries" />
      },
    },
    {
      id: 'details',
      header: () => <span className="sr-only">Details</span>,
      cell: ({ row }) => (
        <Link className="records-row-chevron" aria-label={`Open endpoint ${row.original.name}`} to={`/endpoints/${row.original.id}`}>
          <ChevronRight size={16} />
        </Link>
      ),
    },
  ], [formatDate, mode, stats])

  return (
    <div className="records-page">
      <PageHeader title="Endpoints" description="Manage the destinations that receive your webhooks." actions={<Button onClick={() => setShowDialog(true)}><Plus size={16} aria-hidden="true" />Add endpoint</Button>} />
      {showDialog && <AddEndpointDialog onClose={() => setShowDialog(false)} onCreated={(endpoint) => setCreated({ mode, endpoint })} />}
      {success && (
        <div className="records-success" role="status">
          <CheckCircle2 aria-hidden="true" size={19} />
          <div>
            <strong>Endpoint added · {success.name}</strong>
            <div>{mode === 'demo'
              ? <Link className="records-id-link" to={`/endpoints/${success.id}`}>{formatId('endpoint', success.id, mode)}</Link>
              : <CopyValue value={String(success.id)} display={formatId('endpoint', success.id, mode)} label="Copy registered endpoint ID" />}
              <CopyValue value={success.url} label="Copy registered endpoint URL" />
              <time dateTime={success.created_at}>{formatDate(success.created_at)}</time>
            </div>
          </div>
          <Button variant="ghost" size="icon" aria-label="Dismiss confirmation" onClick={() => setCreated(undefined)}><X size={16} /></Button>
        </div>
      )}
      {mode === 'live'
        ? <StatePanel title="Endpoint list unavailable" description="The API supports endpoint registration. Listing and viewing existing endpoints require read endpoints." icon={<Webhook size={19} />} />
        : demo.isLoading ? <TableSkeleton rows={6} columns={5} />
        : demo.isError ? <RequestError error={demo.error} onRetry={() => void demo.refetch()} />
        : <RecordsTable label="Endpoints" rows={rows} columns={columns} getRowId={(row) => String(row.id)} initialSorting={[{ id: 'created_at', desc: true }]}
          toolbar={<RecordsSearch value={search} onChange={setSearch} placeholder="Search endpoints" />}
          empty={search.trim()
            ? <EmptyRecords title="No matching endpoints" description="Try a different name, ID, or URL." />
            : <EmptyRecords title="No endpoints yet" description="Add a destination to receive webhook events." />}
        />}
    </div>
  )
}

export function EndpointDetailsPage() {
  const params = useParams()
  const id = getRecordId(params.id ?? params.endpointId)
  const { mode, formatDate } = usePreferences()
  const demo = useDemoData()
  const record = mode === 'demo' ? demo.data?.endpoints.find((endpoint) => endpoint.id === id) : undefined
  const deliveries = useMemo(() => getDeliveryRows(demo.data).filter(({ delivery }) => delivery.endpoint_id === id), [demo.data, id])

  return (
    <div className="records-page">
      <BackToRecords to="/endpoints">Endpoints</BackToRecords>
      <PageHeader title={record?.name ?? 'Endpoint details'} />
      {id === undefined ? <StatePanel title="Endpoint not found" description="The endpoint ID in this URL is invalid." icon={<Webhook size={19} />} />
        : mode === 'live' ? <StatePanel title="Endpoint details unavailable" description="The API does not expose individual endpoints or their deliveries yet." icon={<Webhook size={19} />} />
        : demo.isLoading ? <TableSkeleton columns={3} rows={4} />
        : demo.isError ? <RequestError error={demo.error} onRetry={() => void demo.refetch()} />
        : !record ? <StatePanel title="Endpoint not found" description="This endpoint does not exist in the demo dataset." icon={<Webhook size={19} />} />
        : <>
          <DetailFields fields={[
            { label: 'Endpoint ID', value: <CopyValue value={String(record.id)} display={formatId('endpoint', record.id, mode)} label="Copy endpoint ID" /> },
            { label: 'Created at', value: <time dateTime={record.created_at}>{formatDate(record.created_at)}</time> },
            { label: 'Destination URL', value: <CopyValue value={record.url} label="Copy destination URL" /> },
          ]} />
          <section className="records-detail-section" aria-labelledby="endpoint-deliveries">
            <h2 id="endpoint-deliveries">Associated deliveries</h2>
            <DeliveryTable rows={deliveries} columnsToHide={['endpoint', 'updated_at']} empty={<EmptyRecords title="No deliveries for this endpoint" />} />
          </section>
        </>}
    </div>
  )
}
