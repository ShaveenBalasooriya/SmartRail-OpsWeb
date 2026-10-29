import type { Journey } from '@/features/journeys/types'
import { formatRailwayTime } from '@/shared/lib/railwayTime'
import type { LabelSide, LineGeometry, MapLayout, MapPoint, StationPoint } from './layoutMap'

// Trains are placed from the journey's own last and next station, never from a fixed coordinate. A
// running train sits on the drawn line halfway between those two stations; a terminated one sits on the
// last station it departed. A journey in any other status is not on the map at all.

export type TrainCard = {
  x: number
  y: number
  width: number
  height: number
  side: LabelSide
  // The stem joins the near edge of the card to the marker on the line.
  stemX: number
  stemFromY: number
  stemToY: number
}

export type MapTrain = {
  journey: Journey
  serviceName: string
  lineName: string
  // "Between X and Y", "At X" or "Ended at X": the same words the table's Position column uses.
  positionText: string
  // null when the journey names no station this network has. The table still lists it; the map cannot.
  anchor: MapPoint | null
  card: TrainCard | null
  // "Running · 2 min early" or "Terminated · ended here".
  statusText: string
  // "Stale · updated 06:41:09", or null for a fresh journey.
  staleText: string | null
  ariaText: string
}

const CARD_OFFSET = 40
const CARD_STACK_STEP = 74
const CARD_PADDING_X = 12
const MIN_CARD_WIDTH = 168
const MAX_CARD_WIDTH = 260
const CARD_HEIGHT = 48
const STALE_LINE_HEIGHT = 18
const CARD_MARGIN = 8
const MARKER_RADIUS = 8
const AVERAGE_CHARACTER_WIDTH = 0.58

export function placeTrains(journeys: readonly Journey[], layout: MapLayout): MapTrain[] {
  const trains: MapTrain[] = []
  // Two trains on the same segment, or at the same station, would otherwise draw on top of each other.
  const stacks = new Map<string, number>()

  for (const journey of journeys) {
    // Cancelled, completed and scheduled journeys are not drawn: the map shows where trains are, and
    // those three have no position today.
    if (journey.status !== 'running' && journey.status !== 'terminated') {
      continue
    }

    const line = lineForJourney(journey, layout)
    const from = stationOf(journey.lastDepartedStation?.id, layout)
    const to = stationOf(journey.nextStation?.id, layout)
    const position = positionOf(journey, from, to)
    const atStation = atStationOf(journey, from, to)
    const anchor = anchorOf(journey, line, from, to)
    const serviceName = journey.serviceName ?? 'Unnamed service'
    const lineName = journey.lineName ?? line?.name ?? 'network'
    const statusText =
      journey.status === 'terminated'
        ? 'Terminated · ended here'
        : `Running · ${shortDelay(journey.delayMinutes)}`
    const staleText = journey.isStale
      ? `Stale · updated ${formatRailwayTime(journey.lastUpdatedAt, true)}`
      : null

    const stackIndex = stacks.get(position.key) ?? 0
    stacks.set(position.key, stackIndex + 1)

    // A train standing at a station takes the side opposite that station's label, so its stem never
    // cuts through the name. A train between stations sits where there is no label, so it takes the
    // row's own side, which keeps every card in the gap between rows.
    const side: LabelSide | null =
      line === null
        ? null
        : atStation === null
          ? line.cardSide
          : atStation.labelSide === 'above'
            ? 'below'
            : 'above'
    const card =
      anchor === null || side === null
        ? null
        : buildCard({
            anchor,
            side,
            stackIndex,
            layoutWidth: layout.width,
            lines: [serviceName, statusText, staleText],
          })

    trains.push({
      journey,
      serviceName,
      lineName,
      positionText: position.text,
      anchor,
      card,
      statusText,
      staleText,
      ariaText: ariaFor(journey, serviceName, lineName, from, to),
    })
  }

  return trains
}

// The screen reader sentence, in the design's style: "Podi Menike is between Veyangoda and Polgahawela
// on the Main Line, 2 minutes early." It is generated from the same data the drawing uses.
export function describeMap(trains: readonly MapTrain[]): string {
  if (trains.length === 0) {
    return 'Schematic map. No trains are running.'
  }

  return `Schematic map. ${trains.map((train) => train.ariaText).join(' ')}`
}

// Short form for the card and the legend's vocabulary: "2 min early", "On time", "Delay not reported".
function shortDelay(delayMinutes: number | null): string {
  if (delayMinutes === null) {
    return 'Delay not reported'
  }

  if (delayMinutes === 0) {
    return 'On time'
  }

  const minutes = Math.abs(delayMinutes)
  return `${minutes} min ${delayMinutes > 0 ? 'late' : 'early'}`
}

// Long form for the accessible label, as the design writes it.
function delaySentence(delayMinutes: number | null): string {
  if (delayMinutes === null) {
    return 'with no delay reported'
  }

  if (delayMinutes === 0) {
    return 'on time'
  }

  const minutes = Math.abs(delayMinutes)
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ${delayMinutes > 0 ? 'late' : 'early'}`
}

function ariaFor(
  journey: Journey,
  serviceName: string,
  lineName: string,
  from: StationPoint | undefined,
  to: StationPoint | undefined,
): string {
  const staleSuffix = journey.isStale ? ' and stale' : ''

  if (journey.status === 'terminated') {
    const ended = from ?? to
    return ended === undefined
      ? `${serviceName} terminated, position not reported.`
      : `${serviceName} terminated at ${ended.name} on the ${lineName}${journey.isStale ? ', stale' : ''}.`
  }

  if (from !== undefined && to !== undefined && from.stationId !== to.stationId) {
    return `${serviceName} is between ${from.name} and ${to.name} on the ${lineName}, ${delaySentence(journey.delayMinutes)}${staleSuffix}.`
  }

  const at = from ?? to
  return at === undefined
    ? `${serviceName} is running on the ${lineName}, position not reported${staleSuffix}.`
    : `${serviceName} is at ${at.name} on the ${lineName}, ${delaySentence(journey.delayMinutes)}${staleSuffix}.`
}

function positionOf(
  journey: Journey,
  from: StationPoint | undefined,
  to: StationPoint | undefined,
): { text: string; key: string } {
  if (journey.status === 'terminated') {
    const ended = from ?? to
    return ended === undefined
      ? { text: 'Position not reported', key: `unplaced:${journey.id}` }
      : { text: `Ended at ${ended.name}`, key: `at:${ended.stationId}` }
  }

  if (from !== undefined && to !== undefined && from.stationId !== to.stationId) {
    return {
      text: `Between ${from.name} and ${to.name}`,
      key: `between:${[from.stationId, to.stationId].sort().join('|')}`,
    }
  }

  const at = from ?? to
  return at === undefined
    ? { text: 'Position not reported', key: `unplaced:${journey.id}` }
    : { text: `At ${at.name}`, key: `at:${at.stationId}` }
}

function atStationOf(
  journey: Journey,
  from: StationPoint | undefined,
  to: StationPoint | undefined,
): StationPoint | null {
  if (journey.status === 'terminated') {
    return from ?? to ?? null
  }

  return from !== undefined && to !== undefined && from.stationId !== to.stationId
    ? null
    : (from ?? to ?? null)
}

function anchorOf(
  journey: Journey,
  line: LineGeometry | null,
  from: StationPoint | undefined,
  to: StationPoint | undefined,
): MapPoint | null {
  if (journey.status === 'terminated') {
    const ended = from ?? to
    return ended === undefined ? null : { x: ended.x, y: ended.y }
  }

  if (from !== undefined && to !== undefined && from.stationId !== to.stationId) {
    return line === null ? straightMidpoint(from, to) : midpointOnLine(line, from, to)
  }

  const at = from ?? to
  return at === undefined ? null : { x: at.x, y: at.y }
}

function stationOf(
  stationId: string | undefined,
  layout: MapLayout,
): StationPoint | undefined {
  return stationId === undefined ? undefined : layout.stationPoints.get(stationId)
}

function lineForJourney(journey: Journey, layout: MapLayout): LineGeometry | null {
  const byCode = layout.lines.find((line) => line.code === journey.lineCode)
  if (byCode !== undefined) {
    return byCode
  }

  const stationIds = [journey.lastDepartedStation?.id, journey.nextStation?.id].filter(
    (id): id is string => id !== undefined,
  )
  const byStation = layout.lines.find((line) =>
    stationIds.some(
      (id) => line.stations.some((station) => station.stationId === id) ||
        layout.stationPoints.get(id)?.lineId === line.id,
    ),
  )

  return byStation ?? layout.lines[0] ?? null
}

function straightMidpoint(from: MapPoint, to: MapPoint): MapPoint {
  return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
}

// Halfway along the drawn line between the two stations. Between two stops on one row this is the
// straight midpoint; between the interchange and the first stop it follows the fan instead of cutting
// the corner, so the marker stays on the stroke.
function midpointOnLine(line: LineGeometry, from: MapPoint, to: MapPoint): MapPoint {
  const start = line.polyline.findIndex((point) => samePoint(point, from))
  const end = line.polyline.findIndex((point) => samePoint(point, to))

  if (start === -1 || end === -1 || start === end) {
    return straightMidpoint(from, to)
  }

  const low = Math.min(start, end)
  const high = Math.max(start, end)
  return midpointAlong(line.polyline.slice(low, high + 1))
}

function samePoint(a: MapPoint, b: MapPoint): boolean {
  return a.x === b.x && a.y === b.y
}

function midpointAlong(points: readonly MapPoint[]): MapPoint {
  const lengths: number[] = []
  let total = 0

  for (let index = 1; index < points.length; index += 1) {
    const length = Math.hypot(
      points[index].x - points[index - 1].x,
      points[index].y - points[index - 1].y,
    )
    lengths.push(length)
    total += length
  }

  let remaining = total / 2

  for (let index = 1; index < points.length; index += 1) {
    const length = lengths[index - 1]
    if (length > 0 && remaining <= length) {
      const ratio = remaining / length
      return {
        x: points[index - 1].x + (points[index].x - points[index - 1].x) * ratio,
        y: points[index - 1].y + (points[index].y - points[index - 1].y) * ratio,
      }
    }
    remaining -= length
  }

  return points[points.length - 1]
}

type BuildCardArgs = {
  anchor: MapPoint
  side: LabelSide
  stackIndex: number
  layoutWidth: number
  lines: readonly (string | null)[]
}

function buildCard({ anchor, side, stackIndex, layoutWidth, lines }: BuildCardArgs): TrainCard {
  const [name, status, stale] = lines
  const height = CARD_HEIGHT + (stale === null || stale === undefined ? 0 : STALE_LINE_HEIGHT)
  const widest = Math.max(
    textWidth(name ?? '', 13),
    textWidth(status ?? '', 12),
    textWidth(stale ?? '', 12),
  )
  const width = Math.min(
    MAX_CARD_WIDTH,
    Math.max(MIN_CARD_WIDTH, Math.ceil(widest + CARD_PADDING_X * 2)),
  )
  const x = clamp(
    anchor.x - width / 2,
    CARD_MARGIN,
    Math.max(CARD_MARGIN, layoutWidth - width - CARD_MARGIN),
  )
  const y =
    side === 'below'
      ? anchor.y + CARD_OFFSET + stackIndex * CARD_STACK_STEP
      : anchor.y - CARD_OFFSET - height - stackIndex * CARD_STACK_STEP

  return {
    x,
    y,
    width,
    height,
    side,
    stemX: clamp(anchor.x, x + CARD_PADDING_X, x + width - CARD_PADDING_X),
    stemFromY: side === 'below' ? y : y + height,
    stemToY: side === 'below' ? anchor.y + MARKER_RADIUS : anchor.y - MARKER_RADIUS,
  }
}

function textWidth(text: string, fontSize: number): number {
  return text.length * fontSize * AVERAGE_CHARACTER_WIDTH
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}
