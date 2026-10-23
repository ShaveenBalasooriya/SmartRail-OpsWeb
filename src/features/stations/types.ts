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
