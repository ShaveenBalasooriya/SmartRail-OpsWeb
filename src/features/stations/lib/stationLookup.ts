import type { Platform, Station } from '../types'

export type StationIndex = {
  stationsById: ReadonlyMap<string, Station>
  platformsById: ReadonlyMap<string, Platform>
  platformsByStationId: ReadonlyMap<string, readonly Platform[]>
}

// Platform numbers are strings, so "10" must sort after "2". Numeric collation gives that order.
const platformOrder = new Intl.Collator('en', { numeric: true })

// Built once per loaded station list, so a journey's stops can resolve names without a scan per row.
export function indexStations(stations: readonly Station[]): StationIndex {
  const stationsById = new Map<string, Station>()
  const platformsById = new Map<string, Platform>()
  const platformsByStationId = new Map<string, readonly Platform[]>()

  for (const station of stations) {
    stationsById.set(station.id, station)

    const platforms = [...station.platforms].sort((a, b) => platformOrder.compare(a.number, b.number))
    platformsByStationId.set(station.id, platforms)

    for (const platform of platforms) {
      platformsById.set(platform.id, platform)
    }
  }

  return { stationsById, platformsById, platformsByStationId }
}

// null means the id is not in the reference data. Callers show a visible fallback for it, never an
// empty cell, so a missing station is visible instead of silently blank.
export function stationName(index: StationIndex, stationId: string): string | null {
  return index.stationsById.get(stationId)?.name ?? null
}

export function platformNumber(index: StationIndex, platformId: string): string | null {
  return index.platformsById.get(platformId)?.number ?? null
}

// An empty array is a known station with no platforms. null is an unknown station. The two must not be
// confused, so the empty case is not folded into null.
export function platformsOf(index: StationIndex, stationId: string): readonly Platform[] | null {
  return index.platformsByStationId.get(stationId) ?? null
}
