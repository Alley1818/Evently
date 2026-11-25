import { Braces, CircleAlert, CodeXml, LoaderCircle, Send, Terminal } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ApiError } from '@/api/client'
import { useCreateEvent } from '@/api/queries'
import { usePreferences } from '@/app/preferences'
import { Button, CopyButton, Input, PageHeader, Panel, Select, StatePanel } from '@/components/shared/ui'
import type { JsonObject } from '@/types'
import { JsonEditor } from './JsonEditor'
import { eventTemplates, initialTemplate } from './templates'
import './playground.css'

function parseEventData(value: string): JsonObject {
  let parsed: unknown

  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error('Enter valid JSON before sending.')
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Event data must be a JSON object.')
  }

  return parsed as JsonObject
}

function formatJson(data: JsonObject) {
  return JSON.stringify(data, null, 2)
}

function displayResponse(body: string) {
  try {
    return JSON.stringify(JSON.parse(body), null, 2)
  } catch {
    return body
  }
}

type ResponseTab = 'body' | 'headers'

export function PlaygroundPage() {
  const { mode } = usePreferences()

  return (
    <>
      <PageHeader title="Event Playground" description="Compose an event and inspect the API response." />
      <PlaygroundWorkspace key={mode} mode={mode} />
    </>
  )
}

function PlaygroundWorkspace({ mode }: { mode: 'demo' | 'live' }) {
  const createEvent = useCreateEvent()
  const [template, setTemplate] = useState<string>(initialTemplate)
  const [eventType, setEventType] = useState<string>(initialTemplate)
  const [eventData, setEventData] = useState(() => formatJson(eventTemplates[initialTemplate]))
  const [typeError, setTypeError] = useState('')
  const [dataError, setDataError] = useState('')
  const [responseTab, setResponseTab] = useState<ResponseTab>('body')

  const responseError = createEvent.error
  const response = createEvent.data ?? (responseError instanceof ApiError ? responseError : undefined)
  const status = response?.status
  const headers = Object.entries(response?.headers ?? {})
  const responseBody = response?.body ?? ''
  const busy = createEvent.isPending

  function loadTemplate(name: string) {
    const next = eventTemplates[name]
    if (!next) return

    setTemplate(name)
    setEventType(name)
    setEventData(formatJson(next))
    setTypeError('')
    setDataError('')
  }

  function validateData() {
    try {
      const data = parseEventData(eventData)
      setDataError('')
      return data
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Enter valid JSON.')
      return null
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return

    const trimmedType = eventType.trim()
    const data = validateData()
    setTypeError(trimmedType ? '' : 'Enter an event type.')
    if (!trimmedType || !data) return

    setResponseTab('body')
    createEvent.mutate({ event_type: trimmedType, data })
  }

  return (
    <div className="playground-grid">
      <Panel className="playground-panel">
        <form onSubmit={submit} noValidate>
          <div className="playground-panel-heading">
            <h2><CodeXml size={17} aria-hidden="true" /> Request</h2>
            <span className="playground-route"><strong>POST</strong> /events</span>
          </div>

          <div className="playground-fields">
            <div className="playground-fields-row">
              <div className="playground-field">
                <label htmlFor="playground-type">Event type</label>
                <Input
                  id="playground-type"
                  placeholder="order.paid"
                  value={eventType}
                  onChange={(event) => {
                    setEventType(event.target.value)
                    setTemplate('')
                    setTypeError('')
                  }}
                  maxLength={240}
                  aria-invalid={Boolean(typeError)}
                  aria-describedby={typeError ? 'playground-type-error' : undefined}
                  className="playground-type"
                />
                {typeError && <p id="playground-type-error" className="playground-error" role="alert">{typeError}</p>}
              </div>

              <div className="playground-field">
                <label htmlFor="playground-template">Template</label>
                <Select
                  id="playground-template"
                  value={template}
                  onChange={(event) => loadTemplate(event.target.value)}
                >
                  <option value="" disabled>Custom draft</option>
                  {Object.keys(eventTemplates).map((name) => <option key={name} value={name}>{name}</option>)}
                </Select>
              </div>
            </div>

            <div className="playground-json">
              <div className="playground-json-heading">
                <span>Event data</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const data = validateData()
                    if (data) setEventData(formatJson(data))
                  }}
                >
                  <Braces size={15} aria-hidden="true" /> Format JSON
                </Button>
              </div>
              <JsonEditor
                value={eventData}
                onChange={(value) => {
                  setEventData(value)
                  setTemplate('')
                  setDataError('')
                }}
                errorId={dataError ? 'playground-data-error' : undefined}
              />
              {dataError && <p id="playground-data-error" className="playground-error" role="alert">{dataError}</p>}
            </div>
          </div>

          <div className="playground-footer">
            <p className="playground-notice" id="playground-notice">
              <CircleAlert size={16} aria-hidden="true" />
              {mode === 'live' ? 'This event is sent to every registered endpoint.' : 'Demo sends are simulated locally.'}
            </p>
            <Button type="submit" disabled={busy} aria-describedby="playground-notice">
              {busy ? <LoaderCircle className="playground-spinner" size={15} aria-hidden="true" /> : <Send size={15} aria-hidden="true" />}
              {busy ? 'Sending…' : 'Send event'}
            </Button>
          </div>
        </form>
      </Panel>

      <Panel className="playground-panel playground-response" aria-busy={busy}>
        <div className="playground-panel-heading">
          <h2><Terminal size={17} aria-hidden="true" /> Response</h2>
          <span className="sr-only" role="status">
            {status !== undefined && `HTTP ${status}${response?.statusText ? ` ${response.statusText}` : ''}`}
          </span>
          {status !== undefined && (
            <div className="playground-response-meta">
              <span className="playground-http" data-ok={status >= 200 && status < 300}>
                {status}{response?.statusText ? ` ${response.statusText}` : ''}
              </span>
              {response?.durationMs !== undefined && <span>{Math.round(response.durationMs)} ms</span>}
            </div>
          )}
        </div>

        {busy ? (
          <div className="playground-response-state" role="status">
            <LoaderCircle className="playground-spinner" size={21} aria-hidden="true" /> Waiting for a response…
          </div>
        ) : status === undefined ? (
          <div className="playground-response-state">
            {responseError ? (
              <StatePanel tone="error" title="Request failed" description={responseError.message} />
            ) : (
              <div className="playground-response-empty">
                <Terminal size={22} aria-hidden="true" />
                <p>No response yet</p>
                <span>Send an event to see its response here.</span>
              </div>
            )}
          </div>
        ) : (
          <div className="playground-response-content">
            {responseError && <p className="playground-response-error" role="alert">{responseError.message}</p>}
            <div className="playground-response-toolbar">
              <div className="playground-response-buttons" role="group" aria-label="Response view">
                <Button variant="ghost" size="sm" type="button" aria-pressed={responseTab === 'body'} onClick={() => setResponseTab('body')}>Body</Button>
                <Button variant="ghost" size="sm" type="button" aria-pressed={responseTab === 'headers'} onClick={() => setResponseTab('headers')}>Headers</Button>
              </div>
              {responseTab === 'body' && responseBody && <CopyButton value={responseBody} label="Copy response body" />}
            </div>
            {responseTab === 'body' ? (
              responseBody ? <pre className="playground-response-text" aria-label="HTTP response body" tabIndex={0}>{displayResponse(responseBody)}</pre>
                : <p className="playground-no-data">The response body is empty.</p>
            ) : (
              headers.length ? (
                <dl className="playground-response-headers">
                  {headers.map(([key, value]) => (
                    <div key={key}><dt>{key}</dt><dd>{value}</dd></div>
                  ))}
                </dl>
              ) : <p className="playground-no-data">No response headers are available.</p>
            )}
          </div>
        )}
      </Panel>
    </div>
  )
}
