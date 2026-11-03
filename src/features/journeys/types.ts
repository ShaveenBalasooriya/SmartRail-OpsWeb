import type { PublishedChange } from '@/features/publishing/types'

// The operations read endpoints always report a live status, so a journey always has one. The client
// never infers lifecycle status itself (architecture §3); the API is the single source.
export type JourneyStatus = 'scheduled' | 'running' | 'cancelled' | 'terminated' | 'completed'

export const JOURNEY_STATUS_VALUES: JourneyStatus[] = [
  'scheduled',
  'running',
  'cancelled',
  'terminated',
  'completed',
]

export const JOURNEY_STATUS_LABELS: Record<JourneyStatus, string> = {
  scheduled: 'Scheduled',
  running: 'Running',
  cancelled: 'Cancelled',
  terminated: 'Terminated',
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

export const SERVICE_DIRECTION_VALUES: ServiceDirection[] = ['outbound', 'inbound']

export const DIRECTION_LABELS: Record<ServiceDirection, string> = {
  outbound: 'Outbound',
  inbound: 'Inbound',
}

export type JourneyDirectionFilter = ServiceDirection | 'all'

export function isServiceDirection(value: string): value is ServiceDirection {
  return (SERVICE_DIRECTION_VALUES as string[]).includes(value)
}

// Untrusted input from a URL or a select element.
export function isJourneyDirectionFilter(value: string): value is JourneyDirectionFilter {
  return value === 'all' || isServiceDirection(value)
}

// The operations response carries the station and platform a screen names, so the read views show them
// without a second reference-data lookup.
export type StationRef = {
  id: string
  name: string
}

export type PlatformRef = {
  id: string
  number: string
}

// One of today's journeys as the operations feed reports it. The server orders the list by scheduled
// departure; the list request has no date parameter because it only ever covers today.
export type Journey = {
  id: string
  serviceName: string | null
  lineCode: string | null
  lineName: string | null
  direction: ServiceDirection | null
  status: JourneyStatus
  // Whole minutes late (positive) or early (negative). null when the API has no delay to report.
  delayMinutes: number | null
  lastDepartedStation: StationRef | null
  nextStation: StationRef | null
  guardName: string | null
  lastUpdatedAt: string
  // True when the API's own live feed is stale. This is separate from a failed browser refresh.
  isStale: boolean
}

// One stop of a journey. Times are UTC instants; the expected and actual values are the API's, not a
// client-side calculation. The ids stay for the publish forms; the names and the platform number come
// from the same response so the read views need no station lookup.
export type JourneyStop = {
  sequence: number
  stationId: string | null
  stationName: string | null
  isCalling: boolean
  scheduledArrival: string | null
  scheduledDeparture: string | null
  expectedArrival: string | null
  expectedDeparture: string | null
  actualDeparture: string | null
  platformId: string | null
  platformNumber: string | null
}

// The detail view needs the stops and the change history. The board does not, so these fields live on
// this type and not on Journey.
export type JourneyDetail = Journey & {
  stops: JourneyStop[]
  changes: PublishedChange[]
}

// "KDY Main Line", or the half the API supplied. A dash keeps a missing value visible, never blank.
export function lineLabel(journey: Pick<Journey, 'lineCode' | 'lineName'>): string {
  const parts = [journey.lineCode, journey.lineName].filter((part): part is string => part !== null && part !== '')
  return parts.join(' ') || '—'
}
