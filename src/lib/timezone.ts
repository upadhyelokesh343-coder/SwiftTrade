import { Time } from 'lightweight-charts';
import { TimeZoneOption } from '../types';

export const TIMEZONE_STORAGE_KEY = 'trader_chart_timezone_mode';

/**
 * Dynamically detects the user's browser time zone using Intl API.
 */
export function getLocalBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch (e) {
    return 'UTC';
  }
}

/**
 * Resolves a timezone mode ('local', 'utc', or specific IANA timezone) into a valid IANA string.
 */
export function getResolvedTimeZone(mode: string): string {
  if (!mode || mode === 'local') {
    return getLocalBrowserTimeZone();
  }
  if (mode.toLowerCase() === 'utc' || mode.toLowerCase() === 'gmt') {
    return 'UTC';
  }
  return mode;
}

/**
 * Calculates current GMT/UTC offset string, e.g. "UTC+0", "UTC-4", "UTC+5:30".
 */
export function getTimeZoneOffsetString(timeZone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(now);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    if (tzPart?.value) {
      // Normalize "GMT+X" or "GMT-X" to "UTC±X"
      return tzPart.value.replace('GMT', 'UTC');
    }
  } catch (e) {
    // fallback
  }
  return 'UTC';
}

/**
 * Gets short timezone abbreviation e.g. "EDT", "PDT", "UTC", "IST".
 */
export function getTimeZoneAbbr(timeZone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'short',
    });
    const parts = formatter.formatToParts(now);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    if (tzPart?.value) return tzPart.value;
  } catch (e) {
    // fallback
  }
  return timeZone;
}

export interface TimeZoneDisplayInfo {
  mode: string;
  resolvedTimeZone: string;
  displayName: string;
  shortLabel: string;
  abbr: string;
  offsetStr: string;
  isLocal: boolean;
  isUtc: boolean;
}

/**
 * Returns complete display metadata for a timezone mode.
 */
export function getTimeZoneDisplayInfo(mode: string): TimeZoneDisplayInfo {
  const isLocal = !mode || mode === 'local';
  const isUtc = mode === 'utc';
  const resolved = getResolvedTimeZone(mode);
  const abbr = getTimeZoneAbbr(resolved);
  const offsetStr = getTimeZoneOffsetString(resolved);

  let displayName = '';
  let shortLabel = '';

  if (isLocal) {
    const browserTz = getLocalBrowserTimeZone();
    const cleanCity = browserTz.split('/').pop()?.replace(/_/g, ' ') || browserTz;
    displayName = `Local Time (${cleanCity} • ${offsetStr})`;
    shortLabel = `Local (${abbr})`;
  } else if (isUtc) {
    displayName = 'UTC (Coordinated Universal Time)';
    shortLabel = 'UTC';
  } else {
    const cleanCity = resolved.split('/').pop()?.replace(/_/g, ' ') || resolved;
    displayName = `${cleanCity} (${offsetStr})`;
    shortLabel = `${cleanCity} (${abbr})`;
  }

  return {
    mode,
    resolvedTimeZone: resolved,
    displayName,
    shortLabel,
    abbr,
    offsetStr,
    isLocal,
    isUtc,
  };
}

/**
 * Popular world financial hub timezones for the selector.
 */
export const POPULAR_TIMEZONE_OPTIONS: TimeZoneOption[] = [
  { id: 'local', label: 'Local Time (Browser Auto-Detect)', city: 'Your Location', region: 'Auto-Detected' },
  { id: 'utc', label: 'UTC (Exchange Reference Standard)', city: 'London / Global', region: 'Universal' },
  { id: 'America/New_York', label: 'New York (NYSE / NASDAQ)', city: 'New York', region: 'US Eastern' },
  { id: 'Europe/London', label: 'London (LSE / Forex Standard)', city: 'London', region: 'Europe' },
  { id: 'Europe/Frankfurt', label: 'Frankfurt (Deutsche Börse / ECB)', city: 'Frankfurt', region: 'Europe' },
  { id: 'Asia/Tokyo', label: 'Tokyo (TSE / Japan Session)', city: 'Tokyo', region: 'Asia-Pacific' },
  { id: 'Asia/Hong_Kong', label: 'Hong Kong (HKEX)', city: 'Hong Kong', region: 'Asia-Pacific' },
  { id: 'Asia/Singapore', label: 'Singapore (SGX / Asian Forex Hub)', city: 'Singapore', region: 'Asia-Pacific' },
  { id: 'Asia/Kolkata', label: 'Mumbai (NSE / India)', city: 'Mumbai', region: 'South Asia' },
  { id: 'Asia/Dubai', label: 'Dubai (DFM / Middle East)', city: 'Dubai', region: 'Middle East' },
  { id: 'Australia/Sydney', label: 'Sydney (ASX / Pacific Open)', city: 'Sydney', region: 'Australia' },
];

// High-performance formatter cache to avoid repeated Intl allocations during chart pan/zoom
const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getCachedFormatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale || 'default'}_${JSON.stringify(options)}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale || undefined, options);
    formatterCache.set(key, formatter);
  }
  return formatter;
}

/**
 * Formats time axis tick marks in the user's selected or auto-detected local time zone.
 * Matches Lightweight Charts TickMarkType enumeration.
 */
export function formatTickMark(
  time: Time,
  tickMarkType: number,
  locale: string,
  timeZone: string
): string | null {
  const timestampMs = typeof time === 'number' 
    ? time * 1000 
    : (time as any).timestamp 
      ? (time as any).timestamp * 1000 
      : Number(time) * 1000;

  if (isNaN(timestampMs)) return null;
  const date = new Date(timestampMs);

  const opts: Intl.DateTimeFormatOptions = {
    timeZone,
  };

  switch (tickMarkType) {
    case 0: // TickMarkType.Year
      opts.year = 'numeric';
      break;
    case 1: // TickMarkType.Month
      opts.month = 'short';
      opts.year = '2-digit';
      break;
    case 2: // TickMarkType.DayOfMonth
      opts.day = 'numeric';
      opts.month = 'short';
      break;
    case 3: // TickMarkType.Time
      opts.hour = '2-digit';
      opts.minute = '2-digit';
      opts.hour12 = false;
      break;
    case 4: // TickMarkType.TimeWithSeconds
      opts.hour = '2-digit';
      opts.minute = '2-digit';
      opts.second = '2-digit';
      opts.hour12 = false;
      break;
    default:
      opts.hour = '2-digit';
      opts.minute = '2-digit';
      opts.hour12 = false;
  }

  try {
    return getCachedFormatter(locale, opts).format(date);
  } catch (e) {
    return date.toTimeString().slice(0, 8);
  }
}

/**
 * Formats crosshair label on the time axis when hovering candles.
 */
export function formatCrosshairTime(
  time: Time | number,
  timeZone: string,
  locale: string
): string {
  const timestampMs = typeof time === 'number'
    ? time * 1000
    : (time as any).timestamp
      ? (time as any).timestamp * 1000
      : Number(time) * 1000;

  if (isNaN(timestampMs)) return '';
  const date = new Date(timestampMs);

  const opts: Intl.DateTimeFormatOptions = {
    timeZone,
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };

  try {
    return getCachedFormatter(locale, opts).format(date);
  } catch (e) {
    return date.toISOString().replace('T', ' ').slice(0, 19);
  }
}

/**
 * Storage helpers
 */
export function getSavedTimeZoneMode(): string {
  try {
    return localStorage.getItem(TIMEZONE_STORAGE_KEY) || 'local';
  } catch (e) {
    return 'local';
  }
}

export function saveTimeZoneMode(mode: string): void {
  try {
    localStorage.setItem(TIMEZONE_STORAGE_KEY, mode);
  } catch (e) {
    // ignore
  }
}
