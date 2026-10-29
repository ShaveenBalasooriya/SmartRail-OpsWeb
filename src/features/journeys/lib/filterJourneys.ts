import { lineLabel, type Journey, type JourneyDirectionFilter, type JourneyStatusFilter } from '../types'

export type JourneyFilters = {
  status: JourneyStatusFilter
  direction: JourneyDirectionFilter
  // A lineCode, or 'all'. The code rather than the name, because two lines may share a name.
  line: string
  search: string
}

// The lines present in the loaded journeys, for the filter's options. Only a journey with a line code can
// be filtered by code, so a nameless line is left out rather than given a value the API cannot match.
export type LineOption = {
  value: string
  label: string
}

export function listLineOptions(journeys: readonly Journey[]): LineOption[] {
  const options = new Map<string, string>()

  for (const journey of journeys) {
    if (journey.lineCode !== null && journey.lineCode !== '' && !options.has(journey.lineCode)) {
      options.set(journey.lineCode, lineLabel(journey))
    }
  }

  return [...options.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((left, right) => left.label.localeCompare(right.label))
}

// Pure, so it can be tested without React. Each facet short-circuits: an empty filter matches everything.
// Search is case-insensitive, trimmed, and matches the service name only; the line and direction have
// their own selects. Any field may be absent on a journey, and an absent field matches nothing.
export function filterJourneys(journeys: readonly Journey[], filters: JourneyFilters): Journey[] {
  const term = filters.search.trim().toLowerCase()

  return journeys.filter((journey) => {
    if (filters.status !== 'all' && journey.status !== filters.status) {
      return false
    }

    if (filters.direction !== 'all' && journey.direction !== filters.direction) {
      return false
    }

    if (filters.line !== 'all' && journey.lineCode !== filters.line) {
      return false
    }

    if (term === '') {
      return true
    }

    return journey.serviceName !== null && journey.serviceName.toLowerCase().includes(term)
  })
}
