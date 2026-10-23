// Railway times are shown in the railway's own time zone, not the viewer's, so a controller and a
// passenger reading the same departure see the same clock (SmartRail-API RailwayClock default).
export const RAILWAY_TIME_ZONE = 'Asia/Colombo'

export function formatRailwayTime(value: Date | string, withSeconds = false): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: RAILWAY_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: withSeconds ? '2-digit' : undefined,
    hourCycle: 'h23',
  }).format(new Date(value))
}

// The railway calendar day (YYYY-MM-DD) for an instant. en-CA formats dates in that shape.
export function railwayDateKey(value: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: RAILWAY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value)
}

const SERVICE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

// The URL is untrusted. A value that is not a YYYY-MM-DD railway day falls back to today's day, so the API
// is never asked for a day it will refuse.
export function serviceDateFromParam(value: string | null): string {
  return value !== null && SERVICE_DATE_PATTERN.test(value) ? value : railwayDateKey(new Date())
}
