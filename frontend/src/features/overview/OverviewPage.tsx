import { useMemo, useState } from 'react'
import {
  Activity,
  CalendarDays,
  ChartNoAxesCombined,
  CircleCheck,
  CircleX,
  Clock3,
  RadioTower,
  Send,
  Webhook,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useDemoData, useLiveDeliveries } from '@/api/queries'
import { usePreferences } from '@/app/preferences'
import { Button, PageHeader, Panel, Select, StatePanel, StatusBadge, TableSkeleton } from '@/components/shared/ui'
import { formatId, latestAttempt } from '@/lib/format'
import type { DeliveryRecord, DemoData } from '@/types'
import './overview.css'

const hour = 60 * 60 * 1000
const day = 24 * hour

const periods = {
  hour: { label: 'Last hour', duration: hour, buckets: 12, interval: '5-minute' },
  day: { label: 'Last 24 hours', duration: day, buckets: 12, interval: '2-hour' },
  week: { label: 'Last 7 days', duration: 7 * day, buckets: 7, interval: 'daily' },
  month: { label: 'Last 30 days', duration: 30 * day, buckets: 15, interval: '2-day' },
} as const

type Period = keyof typeof periods
type ActivityBucket = { timestamp: number; success: number; failed: number }

const metrics = [
  { key: 'events', label: 'Total events', icon: RadioTower, tone: 'neutral' },
  { key: 'deliveries', label: 'Total deliveries', icon: Send, tone: 'neutral' },
  { key: 'successRate', label: 'Delivery success rate', icon: CircleCheck, tone: 'success' },
  { key: 'failed', label: 'Failed deliveries', icon: CircleX, tone: 'error' },
  { key: 'pending', label: 'Pending deliveries', icon: Clock3, tone: 'pending' },
  { key: 'endpoints', label: 'Registered endpoints', icon: Webhook, tone: 'neutral' },
] as const

const numberFormat = new Intl.NumberFormat('en')
const percentFormat = new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 1 })

function summarize(data: DemoData, period: Period, now: number) {
  const { duration, buckets } = periods[period]
  const start = now - duration
  const bucketWidth = duration / buckets
  const activity: ActivityBucket[] = Array.from({ length: buckets }, (_, index) => ({
    timestamp: start + index * bucketWidth,
    success: 0,
    failed: 0,
  }))
  const deliveries = data.deliveries.filter((item) => {
    const timestamp = Date.parse(item.created_at)
    return timestamp >= start && timestamp <= now
  })
  const completed = { success: 0, failed: 0 }
  const byEndpoint = new Map<number, { success: number; failed: number; pending: number }>()

  for (const item of deliveries) {
    const counts = byEndpoint.get(item.endpoint_id) ?? { success: 0, failed: 0, pending: 0 }
    counts[item.status] += 1
    byEndpoint.set(item.endpoint_id, counts)

    if (item.status !== 'pending') {
      completed[item.status] += 1
      const index = Math.min(buckets - 1, Math.floor((Date.parse(item.created_at) - start) / bucketWidth))
      activity[index][item.status] += 1
    }
  }

  const events = data.events.filter((item) => {
    const timestamp = Date.parse(item.created_at)
    return timestamp >= start && timestamp <= now
  }).length
  const terminal = completed.success + completed.failed

  return {
    activity,
    byEndpoint,
    deliveries,
    totals: {
      events: numberFormat.format(events),
      deliveries: numberFormat.format(deliveries.length),
      successRate: terminal ? percentFormat.format(completed.success / terminal) : '—',
      failed: numberFormat.format(completed.failed),
      pending: numberFormat.format(deliveries.length - terminal),
      endpoints: numberFormat.format(data.endpoints.length),
    },
  }
}

function MetricGrid({ totals, loading = false }: { totals?: ReturnType<typeof summarize>['totals']; loading?: boolean }) {
  return (
    <dl className="overview-metrics" aria-busy={loading}>
      {metrics.map(({ key, label, icon: Icon, tone }) => (
        <Panel className="overview-metric" key={key}>
          <dt><Icon size={15} aria-hidden="true" />{label}</dt>
          <dd data-tone={totals?.[key] === '—' || !totals ? 'neutral' : tone}>
            {loading ? <span className="overview-skeleton overview-skeleton-value" /> : totals?.[key] ?? '—'}
          </dd>
        </Panel>
      ))}
    </dl>
  )
}

function DeliveryActivity({ activity, period }: { activity: ActivityBucket[]; period: Period }) {
  const { formatDate, preferences } = usePreferences()
  const showHours = period === 'hour' || period === 'day'
  const labelFormatter = new Intl.DateTimeFormat('en', {
    ...(showHours ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' as const } : { month: 'short', day: 'numeric' }),
    timeZone: preferences.timezone === 'utc' ? 'UTC' : undefined,
  })

  return (
    <Panel className="overview-panel" aria-labelledby="activity-heading">
      <div className="overview-panel-heading overview-activity-heading">
        <div>
          <h2 id="activity-heading">Delivery activity</h2>
          <p>By creation time · {periods[period].interval} buckets</p>
        </div>
        <div className="overview-legend" aria-hidden="true">
          <span><i className="overview-key-success" />Successful</span>
          <span><i className="overview-key-failed" />Failed</span>
        </div>
      </div>
      {activity.some(({ success, failed }) => success || failed) ? (
        <div className="overview-chart" aria-label="Completed delivery activity by time">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={activity} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(timestamp: number) => labelFormatter.format(timestamp)}
                tick={{ fill: 'var(--muted)', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                minTickGap={25}
              />
              <YAxis
                tick={{ fill: 'var(--muted)', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                width={35}
                tickCount={4}
              />
              <Tooltip
                labelFormatter={(timestamp) => {
                  const date = new Date(Number(timestamp))
                  return Number.isNaN(date.getTime()) ? '' : formatDate(date.toISOString())
                }}
                cursor={{ stroke: 'var(--subtle)', strokeDasharray: '4 4' }}
                contentStyle={{ background: 'var(--surface-raised)', borderColor: 'var(--border)', borderRadius: 8 }}
                labelStyle={{ color: 'var(--text)' }}
              />
              <Area name="Successful" type="monotone" dataKey="success" stroke="var(--accent)" strokeWidth={2} fill="var(--accent)" fillOpacity={0.16} isAnimationActive={false} />
              <Area name="Failed" type="monotone" dataKey="failed" stroke="var(--error)" strokeWidth={1.5} fill="var(--error)" fillOpacity={0.08} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="overview-chart-empty">
          <Activity size={20} aria-hidden="true" />
          <p>No completed deliveries in this period</p>
        </div>
      )}
    </Panel>
  )
}

function RecentDeliveries({ data, deliveries }: { data?: DemoData; deliveries: DeliveryRecord[] }) {
  const { formatDate, mode } = usePreferences()
  const events = new Map(data?.events.map((event) => [event.id, event.event_type]))
  const endpoints = new Map(data?.endpoints.map((endpoint) => [endpoint.id, endpoint.name]))
  const recent = [...deliveries].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, 5)

  return (
    <Panel className="overview-panel" aria-labelledby="recent-heading">
      <div className="overview-panel-heading">
        <h2 id="recent-heading">Recent deliveries</h2>
        <Link className="overview-panel-link" to="/deliveries">All deliveries</Link>
      </div>
      {recent.length ? (
        <div className="overview-table-scroll">
          <table className="overview-table" data-mode={mode} aria-labelledby="recent-heading">
            <thead>
              <tr>
                <th scope="col">Delivery</th>
                <th scope="col">Endpoint</th>
                <th scope="col">Status</th>
                {data && <th scope="col">HTTP</th>}
                <th scope="col">Created</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((delivery) => {
                const attempt = data && latestAttempt(data.attempts.filter((item) => item.delivery_id === delivery.id))
                const eventLabel = events.get(delivery.event_id) ?? `Event ${formatId('event', delivery.event_id, mode)}`
                const endpointLabel = endpoints.get(delivery.endpoint_id) ?? formatId('endpoint', delivery.endpoint_id, mode)
                return (
                  <tr key={delivery.id}>
                    <td>
                      <Link className="overview-record-link" to={`/deliveries/${delivery.id}`}>{formatId('delivery', delivery.id, mode)}</Link>
                      <span className="overview-event-type" title={eventLabel}>{eventLabel}</span>
                    </td>
                    <td className="overview-endpoint-name" title={endpointLabel}>{endpointLabel}</td>
                    <td><StatusBadge status={delivery.status} /></td>
                    {data && <td className="overview-http">{attempt?.response_status ?? '—'}</td>}
                    <td className="overview-created"><time dateTime={delivery.created_at}>{formatDate(delivery.created_at)}</time></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : <p className="overview-panel-empty">{data ? 'No deliveries in this period.' : 'No deliveries recorded.'}</p>}
    </Panel>
  )
}

function EndpointHealth({ data, counts }: { data: DemoData; counts: ReturnType<typeof summarize>['byEndpoint'] }) {
  const endpoints = [...data.endpoints].sort((a, b) => (counts.get(b.id)?.failed ?? 0) - (counts.get(a.id)?.failed ?? 0)).slice(0, 4)

  return (
    <Panel className="overview-panel" aria-labelledby="health-heading">
      <div className="overview-panel-heading">
        <h2 id="health-heading">Endpoint health</h2>
        <Link className="overview-panel-link" to="/endpoints">All endpoints</Link>
      </div>
      {endpoints.length ? (
        <ul className="overview-health-list">
          {endpoints.map((endpoint) => {
            const { success, failed, pending } = counts.get(endpoint.id) ?? { success: 0, failed: 0, pending: 0 }
            const terminal = success + failed
            const health = terminal ? percentFormat.format(success / terminal) + ' successful' : pending ? `${pending} pending` : 'No activity'
            const breakdown = `${success} successful, ${failed} failed, ${pending} pending deliveries`
            return (
              <li className="overview-health-row" key={endpoint.id}>
                <div className="overview-health-heading">
                  <Link to={`/endpoints/${endpoint.id}`}>{endpoint.name}</Link>
                  <span>{health}</span>
                </div>
                <div className="overview-health-bar" role="img" aria-label={breakdown} title={breakdown}>
                  {success > 0 && <span data-tone="success" style={{ flex: success }} />}
                  {failed > 0 && <span data-tone="error" style={{ flex: failed }} />}
                  {pending > 0 && <span data-tone="pending" style={{ flex: pending }} />}
                </div>
              </li>
            )
          })}
        </ul>
      ) : <p className="overview-panel-empty">No registered endpoints.</p>}
    </Panel>
  )
}

export function OverviewPage() {
  const { mode } = usePreferences()
  const [period, setPeriod] = useState<Period>('day')
  const demo = useDemoData()
  const live = useLiveDeliveries()
  const summary = useMemo(() => demo.data ? summarize(demo.data, period, Date.now()) : undefined, [demo.data, period])

  return (
    <div className="overview-page">
      <PageHeader
        title="Overview"
        description="Monitor event traffic and webhook delivery health."
        actions={mode === 'demo' && (
          <label className="overview-period">
            <CalendarDays size={15} aria-hidden="true" />
            <Select aria-label="Reporting period" value={period} onChange={(event) => setPeriod(event.target.value as Period)}>
              {Object.entries(periods).map(([value, option]) => <option key={value} value={value}>{option.label}</option>)}
            </Select>
          </label>
        )}
      />
      {mode === 'live' ? (
        <>
          <MetricGrid />
          <StatePanel title="Overview metrics unavailable" description="Live metrics require API support for overview aggregates and endpoint health." icon={<ChartNoAxesCombined size={19} />} action={<Link className="overview-panel-link" to="/events">Open event history</Link>} />
          {live.isPending ? <TableSkeleton rows={4} columns={4} /> : live.isError ? (
            <StatePanel title="Could not load recent deliveries" description={live.error.message} tone="error" action={<Button variant="secondary" onClick={() => void live.refetch()}>Try again</Button>} />
          ) : <RecentDeliveries deliveries={live.data} />}
        </>
      ) : demo.isPending ? (
        <>
          <MetricGrid loading />
          <Panel className="overview-panel overview-loading-panel" aria-label="Loading delivery activity" aria-busy="true">
            <span className="overview-skeleton overview-skeleton-heading" />
            <span className="overview-skeleton overview-skeleton-chart" />
          </Panel>
          <TableSkeleton rows={4} columns={5} />
        </>
      ) : demo.isError ? (
        <StatePanel title="Could not load demo data" description={demo.error.message} tone="error" action={<Button variant="secondary" onClick={() => void demo.refetch()}>Try again</Button>} />
      ) : demo.data && summary ? (
        <>
          <MetricGrid totals={summary.totals} />
          <DeliveryActivity activity={summary.activity} period={period} />
          <div className="overview-bottom">
            <RecentDeliveries data={demo.data} deliveries={summary.deliveries} />
            <EndpointHealth data={demo.data} counts={summary.byEndpoint} />
          </div>
        </>
      ) : null}
    </div>
  )
}
