import { api } from '@/shared/api/client'
import type { Journey, ServiceDirection } from '../types'

// Wire shape of SmartRail-API JourneyDto (src/Contracts/SmartRail.RailNetwork.Contracts/Timetable.cs),
// kept local to this file. The API also sends stops, which the board does not use.
type JourneyDtoWire = {
  id: string
  serviceName: string
  lineCode: string
  lineName: string
  direction: ServiceDirection
  scheduledDepartureAt: string
}

// serviceDate is a railway calendar day (YYYY-MM-DD). The API accepts only today or tomorrow.
export async function getJourneys(serviceDate: string): Promise<Journey[]> {
  const journeys = await api.get<JourneyDtoWire[]>(
    `/api/v1/timetable/journeys?date=${encodeURIComponent(serviceDate)}`,
  )
  return journeys.map(toJourney)
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
