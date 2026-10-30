// Network reference data. Read by every role; no page of its own, it feeds names and platform numbers
// to the journeys and publishing features.
export type Platform = {
  id: string
  stationId: string
  // A string, not a number: platform numbers can carry a letter suffix.
  number: string
}

export type StationLine = {
  id: string
  code: string
  // Lowercase #rrggbb, supplied by the API like every other line colour.
  color: string
  name: string
}

export type Station = {
  id: string
  code: string
  name: string
  isInterchange: boolean
  platforms: Platform[]
  lines: StationLine[]
}

// One station's place in a line's order. Sequence ascending is the outbound direction; the API returns
// the inbound direction as the same stations reversed, so nothing here depends on travelling direction.
export type LineStation = {
  stationId: string
  code: string
  name: string
  sequence: number
}

// A line and its distinct stations in sequence order, from GET /api/v1/network/lines. The network map
// draws its schematic from this, so no station name or coordinate is written into the component.
export type Line = {
  id: string
  code: string
  // Lowercase #rrggbb, supplied by the API. The map never invents a colour for a line.
  color: string
  name: string
  stations: LineStation[]
}
