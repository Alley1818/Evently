import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { DataMode } from '@/types';

interface Preferences {
  theme: 'dark' | 'light';
  dateFormat: 'short' | 'iso';
  density: 'compact' | 'comfortable';
  timezone: 'local' | 'utc';
}

interface PreferencesContextValue {
  mode: DataMode;
  setMode: (mode: DataMode) => void;
  preferences: Preferences;
  updatePreferences: (patch: Partial<Preferences>) => void;
  formatDate: (value: string) => string;
  timeZoneLabel: string;
}

const defaultPreferences: Preferences = {
  theme: 'dark',
  dateFormat: 'short',
  density: 'compact',
  timezone: 'local',
};
const preferenceKey = 'evently:preferences';
const modeKey = 'evently:mode';
const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function readPreferences(): Preferences {
  try {
    const saved = JSON.parse(localStorage.getItem(preferenceKey) ?? 'null') as Partial<Preferences> | null;
    return {
      theme: saved?.theme === 'light' ? 'light' : defaultPreferences.theme,
      dateFormat: saved?.dateFormat === 'iso' ? 'iso' : defaultPreferences.dateFormat,
      density: saved?.density === 'comfortable' ? 'comfortable' : defaultPreferences.density,
      timezone: saved?.timezone === 'utc' ? 'utc' : defaultPreferences.timezone,
    };
  } catch {
    return defaultPreferences;
  }
}

function readMode(): DataMode {
  try {
    return localStorage.getItem(modeKey) === 'live' ? 'live' : 'demo';
  } catch {
    return 'demo';
  }
}

function saveLocal(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Preferences still apply until this tab closes.
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(readPreferences);
  const [mode, setMode] = useState(readMode);

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
    document.documentElement.dataset.density = preferences.density;
    saveLocal(preferenceKey, JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => saveLocal(modeKey, mode), [mode]);

  const timezone = preferences.timezone === 'utc' ? 'UTC' : undefined;
  const shortDate = new Intl.DateTimeFormat('en-GB', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    hourCycle: 'h23', timeZone: timezone,
  });
  const isoDate = new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    second: '2-digit', hourCycle: 'h23', timeZone: timezone,
  });

  function formatDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    if (preferences.dateFormat === 'short') return shortDate.format(date);
    return isoDate.format(date).replace(' ', 'T') + (timezone ? 'Z' : '');
  }

  return (
    <PreferencesContext.Provider value={{
      mode,
      setMode,
      preferences,
      updatePreferences: (patch) => setPreferences((current) => ({ ...current, ...patch })),
      formatDate,
      timeZoneLabel: shortDate.resolvedOptions().timeZone,
    }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('PreferencesProvider is required');
  return context;
}
