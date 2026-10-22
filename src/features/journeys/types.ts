// null means the timetable did not report a live status. The timetable endpoint lists scheduled
// journeys only and carries no live state, so until the live-state read endpoint exists the board
// shows "not reported" rather than guessing. Clients never infer lifecycle status (architecture §3).
export type JourneyStatus = 'scheduled' | 'running' | 'cancelled' | 'completed'

export const JOURNEY_STATUS_VALUES: JourneyStatus[] = ['scheduled', 'running', 'cancelled', 'completed']

export const JOURNEY_STATUS_LABELS: Record<JourneyStatus, string> = {
  scheduled: 'Scheduled',
  running: 'Running',
  cancelled: 'Cancelled',
  completed: 'Completed',
}

export type JourneyStatusFilter = JourneyStatus | 'all'

export function isJourneyStatus(value: string): value is JourneyStatus {
  return (JOURNEY_STATUS_VALUES as string[]).includes(value)
}

// Untrusted input from a URL or a select element.
export function isJourneyStatusFilter(value: string): value is JourneyStatusFilter {
  return value === 'all' || isJourneyStatus(value)
}

export type ServiceDirection = 'outbound' | 'inbound'

export const DIRECTION_LABELS: Record<ServiceDirection, string> = {
  outbound: 'Outbound',
  inbound: 'Inbound',
}

export type Journey = {
  id: string
  serviceName: string
  lineCode: string
  lineName: string
  direction: ServiceDirection
  // The first stop's scheduled departure, as a UTC instant from the API.
  scheduledDepartureAt: string
  status: JourneyStatus | null
}
