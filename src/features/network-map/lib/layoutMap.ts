import type { Line } from '@/features/stations/types'

// The schematic is generated from the loaded network: no station name and no coordinate is written into
// the component. The shape follows the design's fan: a shared station is one interchange marker on the
// left, every line leaves it for its own horizontal row, and the stations follow in sequence order along
// that row. A network of one line, or of ten, goes through the same code.

export type LabelSide = 'above' | 'below'

export type MapPoint = {
  x: number
  y: number
}

export type StationPoint = MapPoint & {
  stationId: string
  name: string
  // The line whose row carries this stop. A shared station belongs to the hub instead and names the
  // first line it appears on, so a train standing on it still knows which row it is next to.
  lineId: string
  labelSide: LabelSide
}

export type HubStation = StationPoint & {
  // Where the name and the word "Interchange" are drawn, under and to the left of the marker.
  label: MapPoint
}

export type LineGeometry = {
  id: string
  code: string
  name: string
  // The line's own lowercase #rrggbb from the API. The component turns it into a CSS custom property
  // and derives the dark-theme variant, so this module carries no palette and no colour literal.
  colour: string
  rowY: number
  // The side the line's name is written on. The first row's name is above it, the second row's below,
  // and so on, as the design does.
  labelSide: LabelSide
  // Trains on this row sit on the other side of it from the name, which keeps the cards in the gap
  // between rows and away from the line names.
  cardSide: LabelSide
  path: string
  // The start point, the bend and each station, in order. Train placement measures along this so a
  // train between the interchange and the first station still lands on the drawn line.
  polyline: MapPoint[]
  label: MapPoint
  stations: StationPoint[]
}

export type MapLayout = {
  width: number
  height: number
  viewBox: string
  stationRadius: number
  interchangeRadius: number
  lines: LineGeometry[]
  hubs: HubStation[]
  // Every station the map draws, keyed by id, so train placement never scans the lines.
  stationPoints: ReadonlyMap<string, StationPoint>
  outbound: { from: MapPoint; to: MapPoint; label: MapPoint }
}

const HUB_X = 90
const HUB_LABEL_X = 12
const BEND_X = 190
const STATION_GAP = 120
const FIRST_STATION_X = BEND_X + STATION_GAP
const TOP_ROW_Y = 120
const TWO_LINE_ROW_GAP = 240
const MULTI_LINE_ROW_GAP = 200
const BOTTOM_PADDING = 120
const RIGHT_PADDING = 110
const MIN_WIDTH = 640
const MIN_HEIGHT = 360
const HUB_GAP = 90
const HUB_LABEL_OFFSET = 46
const LINE_NAME_ABOVE_OFFSET = 58
const LINE_NAME_BELOW_OFFSET = 68
const STATION_RADIUS = 7
const INTERCHANGE_RADIUS = 15

export function layoutMap(lines: readonly Line[]): MapLayout {
  // The API order is kept: it is the design's "first line upward". The row gap only widens for a
  // network of three or more lines, where every row must share the height evenly.
  const ordered = [...lines]
  const rowGap = ordered.length <= 2 ? TWO_LINE_ROW_GAP : MULTI_LINE_ROW_GAP
  const rows = ordered.map((_, index) => TOP_ROW_Y + index * rowGap)
  const centreY = rows.length === 0 ? TOP_ROW_Y : (rows[0] + rows[rows.length - 1]) / 2
  const sharedIds = sharedStationIds(ordered)
  const hubs = buildHubs(ordered, sharedIds, centreY)
  const stationPoints = new Map<string, StationPoint>()

  for (const hub of hubs) {
    stationPoints.set(hub.stationId, hub)
  }

  const lineGeometries = ordered.map((line, index) => {
    const rowY = rows[index] ?? TOP_ROW_Y
    const hub = hubs.find((candidate) =>
      line.stations.some((station) => station.stationId === candidate.stationId),
    )
    const start = hub === undefined ? { x: HUB_X, y: rowY } : { x: hub.x, y: hub.y }
    const bend = { x: BEND_X, y: rowY }
    const labelSide: LabelSide = index % 2 === 0 ? 'above' : 'below'

    const stations = [...line.stations]
      .sort((a, b) => a.sequence - b.sequence)
      .filter((station) => !sharedIds.has(station.stationId))
      .map<StationPoint>((station, position) => {
        const point: StationPoint = {
          stationId: station.stationId,
          name: station.name,
          lineId: line.id,
          x: FIRST_STATION_X + position * STATION_GAP,
          y: rowY,
          // Alternating sides keep two long names on one row from running into each other.
          labelSide: position % 2 === 0 ? 'above' : 'below',
        }
        stationPoints.set(point.stationId, point)
        return point
      })

    const endX = stations.length === 0 ? BEND_X + 20 : stations[stations.length - 1].x
    const path = `M ${start.x} ${start.y} L ${bend.x} ${bend.y} L ${endX} ${rowY}`

    return {
      id: line.id,
      code: line.code,
      name: line.name,
      colour: line.color,
      rowY,
      labelSide,
      cardSide: labelSide === 'above' ? 'below' : 'above',
      path,
      polyline: [start, bend, ...stations.map((station) => ({ x: station.x, y: station.y }))],
      label: {
        x: BEND_X + 20,
        y: rowY + (labelSide === 'above' ? -LINE_NAME_ABOVE_OFFSET : LINE_NAME_BELOW_OFFSET),
      },
      stations,
    } satisfies LineGeometry
  })

  const lastStationX = Math.max(
    FIRST_STATION_X,
    ...lineGeometries.flatMap((line) => line.stations.map((station) => station.x)),
  )
  const lastRowY = rows[rows.length - 1] ?? TOP_ROW_Y
  const width = Math.max(MIN_WIDTH, lastStationX + RIGHT_PADDING)
  const height = Math.max(MIN_HEIGHT, lastRowY + BOTTOM_PADDING)
  const topRowY = rows[0] ?? TOP_ROW_Y
  const arrowCentreX = Math.round((FIRST_STATION_X + lastStationX) / 2)

  return {
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
    stationRadius: STATION_RADIUS,
    interchangeRadius: INTERCHANGE_RADIUS,
    lines: lineGeometries,
    hubs,
    stationPoints,
    outbound: {
      from: { x: arrowCentreX - 25, y: topRowY - LINE_NAME_ABOVE_OFFSET },
      to: { x: arrowCentreX + 25, y: topRowY - LINE_NAME_ABOVE_OFFSET },
      label: { x: arrowCentreX + 60, y: topRowY - LINE_NAME_ABOVE_OFFSET + 4 },
    },
  }
}

// A station on more than one line is the interchange the design draws once. The lines payload does not
// carry the station's own isInterchange flag, so appearing on two lines is the signal available here.
function sharedStationIds(lines: readonly Line[]): ReadonlySet<string> {
  const counts = new Map<string, number>()

  for (const line of lines) {
    const seenOnThisLine = new Set<string>()
    for (const station of line.stations) {
      if (seenOnThisLine.has(station.stationId)) {
        continue
      }
      seenOnThisLine.add(station.stationId)
      counts.set(station.stationId, (counts.get(station.stationId) ?? 0) + 1)
    }
  }

  return new Set([...counts].filter(([, count]) => count > 1).map(([id]) => id))
}

function buildHubs(
  lines: readonly Line[],
  sharedIds: ReadonlySet<string>,
  centreY: number,
): HubStation[] {
  const seen = new Set<string>()
  const found: { stationId: string; name: string; lineId: string }[] = []

  for (const line of lines) {
    for (const station of line.stations) {
      if (!sharedIds.has(station.stationId) || seen.has(station.stationId)) {
        continue
      }
      seen.add(station.stationId)
      found.push({ stationId: station.stationId, name: station.name, lineId: line.id })
    }
  }

  // One shared station sits on the centre line of the diagram, as the design does. Several are stacked
  // around it, still read once each.
  const firstY = centreY - ((found.length - 1) * HUB_GAP) / 2

  return found.map((station, index) => {
    const y = firstY + index * HUB_GAP
    return {
      ...station,
      x: HUB_X,
      y,
      labelSide: 'above',
      label: { x: HUB_LABEL_X, y: y + HUB_LABEL_OFFSET },
    }
  })
}


