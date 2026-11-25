import { ArrowLeft, Inbox } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Button, CopyButton, StatePanel } from '@/components/shared/ui'
import './records.css'

export function BackToRecords({ to, children }: { to: string; children: ReactNode }) {
  return <Link className="records-back" to={to}><ArrowLeft size={15} aria-hidden="true" />{children}</Link>
}

export function DetailFields({ fields }: { fields: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="records-detail-fields">
      {fields.map(({ label, value }) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function CopyValue({ value, display, label }: { value: string; display?: string; label: string }) {
  return (
    <span className="records-copy-value">
      <code>{display ?? value}</code>
      <CopyButton value={value} label={label} />
    </span>
  )
}

export function MissingValue({ label = 'Unavailable' }: { label?: string }) {
  return <span className="records-muted" title={label} aria-label={label}>—</span>
}

export function EmptyRecords({ title, description }: { title: string; description?: string }) {
  return (
    <div className="records-empty">
      <Inbox size={22} aria-hidden="true" />
      <strong>{title}</strong>
      {description && <span>{description}</span>}
    </div>
  )
}

export function RequestError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <StatePanel
      title="Couldn’t load records"
      description={error.message}
      tone="error"
      action={<Button variant="secondary" onClick={onRetry}>Try again</Button>}
    />
  )
}

export function getRecordId(param: string | undefined) {
  if (!param || !/^\d+$/.test(param)) return undefined
  const id = Number(param)
  return Number.isSafeInteger(id) && id > 0 ? id : undefined
}
