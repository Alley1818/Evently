import { CalendarClock, Globe, Moon, Rows3, Sun } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { usePreferences } from '@/app/preferences'
import { Button, PageHeader, Panel, Select } from '@/components/shared/ui'
import './settings.css'

interface SettingRowProps {
  labelId: string
  label: string
  help: string
  icon: ReactNode
  children: ReactNode
}

function SettingRow({ labelId, label, help, icon, children }: SettingRowProps) {
  return (
    <div className="settings-row">
      <div className="settings-label">
        <span className="settings-icon" aria-hidden="true">{icon}</span>
        <div>
          <span id={labelId} className="settings-label-name">{label}</span>
          <p id={`${labelId}-help`}>{help}</p>
        </div>
      </div>
      <div className="settings-control">{children}</div>
    </div>
  )
}

export function SettingsPage() {
  const { preferences, updatePreferences, formatDate, timeZoneLabel } = usePreferences()
  const [sampleTime] = useState(() => new Date().toISOString())

  return (
    <>
      <PageHeader title="Settings" description="Display preferences are saved in this browser." />

      <Panel className="settings-panel">
        <SettingRow
          labelId="settings-theme"
          label="Theme"
          help="Change the dashboard appearance."
          icon={<Sun size={17} />}
        >
          <div className="settings-theme-toggle" role="group" aria-labelledby="settings-theme" aria-describedby="settings-theme-help">
            <Button type="button" variant="ghost" size="sm" aria-pressed={preferences.theme === 'dark'} onClick={() => updatePreferences({ theme: 'dark' })}>
              <Moon size={15} aria-hidden="true" /> Dark
            </Button>
            <Button type="button" variant="ghost" size="sm" aria-pressed={preferences.theme === 'light'} onClick={() => updatePreferences({ theme: 'light' })}>
              <Sun size={15} aria-hidden="true" /> Light
            </Button>
          </div>
        </SettingRow>

        <SettingRow
          labelId="settings-density"
          label="Table density"
          help="Adjust row spacing across tables."
          icon={<Rows3 size={17} />}
        >
          <Select
            aria-labelledby="settings-density"
            aria-describedby="settings-density-help"
            value={preferences.density}
            onChange={(event) => updatePreferences({ density: event.target.value === 'comfortable' ? 'comfortable' : 'compact' })}
          >
            <option value="compact">Compact</option>
            <option value="comfortable">Comfortable</option>
          </Select>
        </SettingRow>

        <SettingRow
          labelId="settings-format"
          label="Date and time format"
          help="Choose how timestamps are displayed."
          icon={<CalendarClock size={17} />}
        >
          <Select
            aria-labelledby="settings-format"
            aria-describedby="settings-format-help"
            value={preferences.dateFormat}
            onChange={(event) => updatePreferences({ dateFormat: event.target.value === 'iso' ? 'iso' : 'short' })}
          >
            <option value="short">Readable</option>
            <option value="iso">ISO 8601</option>
          </Select>
        </SettingRow>

        <SettingRow
          labelId="settings-timezone"
          label="Time zone"
          help="Use your device’s zone or Coordinated Universal Time."
          icon={<Globe size={17} />}
        >
          <Select
            aria-labelledby="settings-timezone"
            aria-describedby="settings-timezone-help"
            value={preferences.timezone}
            onChange={(event) => updatePreferences({ timezone: event.target.value === 'utc' ? 'utc' : 'local' })}
          >
            <option value="local">Local time</option>
            <option value="utc">UTC</option>
          </Select>
        </SettingRow>

        <div className="settings-preview">
          <span>Timestamp preview</span>
          <span className="settings-timestamp" aria-live="polite"><time dateTime={sampleTime}>{formatDate(sampleTime)}</time> <span>{timeZoneLabel}</span></span>
        </div>
      </Panel>
    </>
  )
}
