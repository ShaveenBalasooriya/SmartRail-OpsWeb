import type { PublishedChange } from '@/features/publishing/types'
import { api } from '@/shared/api/client'
import type { Journey, JourneyDetail, JourneyStatus, JourneyStop, ServiceDirection } from '../types'

// Wire shapes of the two operations reads, checked against /openapi/v1.json on 2026-10-28 and kept
// local to this file. GET /api/v1/operations/journeys returns today's journeys in scheduled-departure
// order; GET /api/v1/operations/journeys/{journeyId} returns the journey, its stops and its changes.
type StationRefWire = {
  id: string
  name: string
}

type PlatformRefWire = {
  id: string
  number: string
}

type JourneyWire = {
  id: string
  serviceName: string | null
  lineCode: string | null
  lineName: string | null
  direction: ServiceDirection | null
  status: JourneyStatus
  // The OpenAPI types delayMinutes as integer-or-string-or-null, like a stop sequence.
  delayMinutes: number | string | null
  lastDepartedStation: StationRefWire | null
  nextStation: StationRefWire | null
  guardName: string | null
  lastUpdatedAt: string
  isStale: boolean
}

type JourneyStopWire = {
  sequence: number | string
  station: StationRefWire | null
  isCalling: boolean
  scheduledArrival: string | null
  scheduledDeparture: string | null
  expectedArrival: string | null
  expectedDeparture: string | null
  actualDeparture: string | null
  platform: PlatformRefWire | null
}

type ChangeWire = {
  id: string
  type: PublishedChange['type']
  // The API types the values as strings, but a platform change can name no previous platform, so a
  // null is dropped rather than turned into the text "null".
  values: Record<string, string | null>
  publisherName: string | null
  publishedAt: string
  provenance: PublishedChange['provenance']
  corrected: boolean
}

type JourneyDetailWire = {
  journey: JourneyWire
  stops: JourneyStopWire[]
  changes: ChangeWire[]
}

// Today's journeys. The operations list has no date parameter, so neither does this call.
export async function getJourneys(): Promise<Journey[]> {
  const journeys = await api.get<JourneyWire[]>('/api/v1/operations/journeys')
  return journeys.map(toJourney)
}

// A 404 comes back from the API as ProblemDetails and the shared client turns it into an ApiError,
// which the detail page shows as "Journey not found". There is no day-list fallback any more.
export async function getJourney(journeyId: string): Promise<JourneyDetail> {
  const detail = await api.get<JourneyDetailWire>(
    `/api/v1/operations/journeys/${encodeURIComponent(journeyId)}`,
  )

  return {
    ...toJourney(detail.journey),
    stops: detail.stops.map(toJourneyStop),
    changes: detail.changes.map(toPublishedChange),
  }
}

function toJourney(journey: JourneyWire): Journey {
  return {
    id: journey.id,
    serviceName: journey.serviceName,
    lineCode: journey.lineCode,
    lineName: journey.lineName,
    direction: journey.direction,
    status: journey.status,
    delayMinutes: toOptionalInteger(journey.delayMinutes, 'delay minutes'),
    lastDepartedStation: journey.lastDepartedStation,
    nextStation: journey.nextStation,
    guardName: journey.guardName,
    lastUpdatedAt: journey.lastUpdatedAt,
    isStale: journey.isStale,
  }
}

function toJourneyStop(stop: JourneyStopWire): JourneyStop {
  return {
    sequence: toInteger(stop.sequence, 'stop sequence'),
    stationId: stop.station?.id ?? null,
    stationName: stop.station?.name ?? null,
    isCalling: stop.isCalling,
    scheduledArrival: stop.scheduledArrival,
    scheduledDeparture: stop.scheduledDeparture,
    expectedArrival: stop.expectedArrival,
    expectedDeparture: stop.expectedDeparture,
    actualDeparture: stop.actualDeparture,
    platformId: stop.platform?.id ?? null,
    platformNumber: stop.platform?.number ?? null,
  }
}

function toPublishedChange(change: ChangeWire): PublishedChange {
  const values: Record<string, string> = {}
  for (const [key, value] of Object.entries(change.values)) {
    if (value !== null) {
      values[key] = value
    }
  }

  return {
    id: change.id,
    type: change.type,
    values,
    publisherName: change.publisherName,
    publishedAt: change.publishedAt,
    provenance: change.provenance,
    corrected: change.corrected,
  }
}

// The API types these numbers as an integer or a string, so both are read here, in one place. A value
// that is not a whole number cannot be ordered or shown, so it fails loudly instead of being guessed.
function toInteger(value: number | string, label: string): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10)
  if (!Number.isInteger(parsed)) {
    throw new Error(`The operations feed sent ${label} that is not a whole number.`)
  }
  return parsed
}

function toOptionalInteger(value: number | string | null, label: string): number | null {
  return value === null ? null : toInteger(value, label)
}
