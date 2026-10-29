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

// A date and time together, for records that can span more than one railway day (the audit trail).
export function formatRailwayDateTime(value: Date | string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: RAILWAY_TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value))
}

// Asia/Colombo has been a fixed UTC+05:30 with no daylight saving since 2006, so a wall-clock value from a
// datetime-local input can be given that offset directly. Browsers interpret a bare value in the viewer's
// zone, which would shift an auditor's filter by their own offset.
const RAILWAY_UTC_OFFSET = '+05:30'

// Converts a railway wall-clock value (YYYY-MM-DDTHH:mm[:ss]) to the UTC instant the API expects.
export function railwayLocalToIso(value: string): string {
  return new Date(`${value}${RAILWAY_UTC_OFFSET}`).toISOString()
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
