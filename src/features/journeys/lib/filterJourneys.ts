import type { Journey, JourneyStatusFilter } from '../types'

export type JourneyFilters = {
  status: JourneyStatusFilter
  search: string
}

// Pure, so it can be tested without React. Each facet short-circuits: an empty status filter or
// an empty search matches everything. Search is case-insensitive, trimmed, and matches the service
// name or the line's code or name.
export function filterJourneys(journeys: readonly Journey[], filters: JourneyFilters): Journey[] {
  const term = filters.search.trim().toLowerCase()

  return journeys.filter((journey) => {
    if (filters.status !== 'all' && journey.status !== filters.status) {
      return false
    }

    if (term === '') {
      return true
    }

    return [journey.serviceName, journey.lineCode, journey.lineName].some((text) =>
      text.toLowerCase().includes(term),
    )
  })
}
