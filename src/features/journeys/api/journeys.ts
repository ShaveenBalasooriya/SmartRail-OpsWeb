import { ApiError } from '@/shared/api/ApiError'
import { api } from '@/shared/api/client'
import type { Journey, JourneyDetail, JourneyStop, ServiceDirection } from '../types'

// Wire shape of SmartRail-API JourneyDto (src/Contracts/SmartRail.RailNetwork.Contracts/Timetable.cs),
// kept local to this file. The board maps only the fields it shows; the detail view reads serviceDate
// and stops (openapi/v1.json, checked 2026-10-22).
type JourneyDtoWire = {
  id: string
  serviceName: string
  lineCode: string
  lineName: string
  direction: ServiceDirection
  serviceDate: string
  scheduledDepartureAt: string
  stops: JourneyStopDtoWire[]
}

// The API types sequence as an integer or a string (JourneyStopDto), so it is parsed in one place.
type JourneyStopDtoWire = {
  sequence: number | string
  stationId: string
  isCalling: boolean
  scheduledArrival: string | null
  scheduledDeparture: string | null
  platformId: string | null
}

// serviceDate is a railway calendar day (YYYY-MM-DD). The API accepts only today or tomorrow.
export async function getJourneys(serviceDate: string): Promise<Journey[]> {
  const journeys = await api.get<JourneyDtoWire[]>(
    `/api/v1/timetable/journeys?date=${encodeURIComponent(serviceDate)}`,
  )
  return journeys.map(toJourney)
}

// There is no GET-by-id on the real API yet; GET /operations/journeys/{id} arrives with
// add-controller-operations. Until then the detail reads the day's timetable list, which already carries
// each journey's stops, and picks the journey by id. Replace this when the endpoint exists.
export async function getJourney(id: string, serviceDate: string): Promise<JourneyDetail> {
  const journeys = await api.get<JourneyDtoWire[]>(
    `/api/v1/timetable/journeys?date=${encodeURIComponent(serviceDate)}`,
  )
  const journey = journeys.find((candidate) => candidate.id === id)
  if (!journey) {
    throw new ApiError(404, 'NOT_FOUND', 'This journey is not on the timetable for that day.')
  }
  return toJourneyDetail(journey)
}

// The timetable endpoint has no status field, so every journey is mapped to null: "not reported".
// Mapping to "scheduled" would tell a controller that a train which has already left is still
// waiting to depart. Replace this with the live-state status when the endpoint exists.
function toJourney(journey: JourneyDtoWire): Journey {
  return {
    id: journey.id,
    serviceName: journey.serviceName,
    lineCode: journey.lineCode,
    lineName: journey.lineName,
    direction: journey.direction,
    scheduledDepartureAt: journey.scheduledDepartureAt,
    status: null,
  }
}

// Only the detail path maps stops, so a malformed stop cannot break the board's list.
function toJourneyDetail(journey: JourneyDtoWire): JourneyDetail {
  return {
    ...toJourney(journey),
    serviceDate: journey.serviceDate,
    stops: journey.stops.map(toJourneyStop),
  }
}

function toJourneyStop(stop: JourneyStopDtoWire): JourneyStop {
  return {
    sequence: toSequence(stop.sequence),
    stationId: stop.stationId,
    isCalling: stop.isCalling,
    scheduledArrival: stop.scheduledArrival,
    scheduledDeparture: stop.scheduledDeparture,
    platformId: stop.platformId,
  }
}

// A sequence that is not a whole number cannot be ordered or shown, so it fails loudly rather than
// sorting the stop to an arbitrary place. The API's pattern already guarantees an integer.
function toSequence(value: number | string): number {
  const sequence = typeof value === 'number' ? value : Number.parseInt(value, 10)
  if (!Number.isInteger(sequence)) {
    throw new Error('The timetable sent a stop sequence that is not a whole number.')
  }
  return sequence
}
