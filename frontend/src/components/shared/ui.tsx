import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import { AlertCircle, Check, ChevronDown, CircleDashed, Copy, LoaderCircle } from 'lucide-react';
import type { DeliveryStatus, JsonValue } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/classnames';

export { Button } from '@/components/ui/button';
export { Input } from '@/components/ui/input';

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return (
    <span className="ui-select-wrap">
      <select className={cn('ui-select', className)} {...props} />
      <ChevronDown size={14} aria-hidden="true" />
    </span>
  );
}

export function Panel({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('ui-panel', className)} {...props} />;
}

export function PageHeader({ title, description, actions }: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-heading-actions">{actions}</div>}
    </header>
  );
}

const statusLabels = { pending: 'Pending', success: 'Success', failed: 'Failed' };

export function StatusBadge({ status }: { status: DeliveryStatus }) {
  return <span className={`status-badge status-${status}`}><span aria-hidden="true" />{statusLabels[status]}</span>;
}

export function CopyButton({ value, label = 'Copy', className }: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle');

  useEffect(() => {
    if (state === 'idle') return;
    const timeout = window.setTimeout(() => setState('idle'), 1800);
    return () => window.clearTimeout(timeout);
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState('copied');
    } catch {
      setState('error');
    }
  }

  const feedback = state === 'copied' ? 'Copied' : state === 'error' ? 'Copy failed' : label;

  return (
    <Button variant="ghost" size="icon" className={className} onClick={() => void copy()} title={feedback} aria-label={label}>
      {state === 'copied' ? <Check size={15} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      <span className="sr-only" role="status">{state !== 'idle' ? feedback : ''}</span>
    </Button>
  );
}

const tokenPattern = /("(?:\\.|[^"\\])*"\s*:|"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:e[+-]?\d+)?|\b(?:true|false|null)\b)/gi;

function JsonTokens({ text }: { text: string }) {
  return text.split(tokenPattern).map((part, index) => {
    if (index % 2 === 0) return part;
    const kind = part.startsWith('"')
      ? part.endsWith(':') ? 'key' : 'string'
      : /^[tf]/.test(part) ? 'boolean' : part === 'null' ? 'null' : 'number';
    return <span key={index} className={`json-${kind}`}>{part}</span>;
  });
}

export function JsonViewer({ value, title = 'JSON payload' }: { value: JsonValue; title?: string }) {
  const text = JSON.stringify(value, null, 2);
  return (
    <Panel className="json-viewer">
      <div className="json-viewer-heading">
        <h2>{title}</h2>
        <CopyButton value={text} label={`Copy ${title.toLowerCase()}`} />
      </div>
      <pre tabIndex={0} aria-label={title}><code><JsonTokens text={text} /></code></pre>
    </Panel>
  );
}

export function StatePanel({ title, description, icon, action, tone = 'neutral' }: {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  tone?: 'error' | 'neutral';
}) {
  return (
    <Panel className={`state-panel state-panel--${tone}`}>
      <div className="state-panel-icon" aria-hidden="true">
        {icon ?? (tone === 'error' ? <AlertCircle size={19} /> : <CircleDashed size={19} />)}
      </div>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action}
    </Panel>
  );
}

export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <Panel className="table-skeleton" aria-busy="true" aria-label="Loading table">
      {Array.from({ length: rows + 1 }, (_, row) => (
        <div key={row} style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }, (_, column) => <span className="skeleton" key={column} />)}
        </div>
      ))}
    </Panel>
  );
}

export function PageLoading() {
  return <div className="page-loading" role="status"><LoaderCircle size={18} aria-hidden="true" />Loading page…</div>;
}
