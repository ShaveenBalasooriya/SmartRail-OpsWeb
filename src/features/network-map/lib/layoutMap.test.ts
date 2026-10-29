import { describe, expect, it } from 'vitest'
import type { Line } from '@/features/stations/types'
import { layoutMap } from './layoutMap'

// Real seeded names, but the function never sees them as special: the same tests would pass with any
// list, and the last case proves it.
function makeLine(code: string, name: string, stationNames: readonly string[]): Line {
  return {
    id: `line-${code.toLowerCase()}`,
    code,
    name,
    stations: stationNames.map((stationName, index) => ({
      stationId: `st-${stationName.toLowerCase().replace(/[^a-z]+/g, '-')}`,
      code: stationName.slice(0, 3).toUpperCase(),
      name: stationName,
      sequence: index + 1,
    })),
  }
}

const coastal = makeLine('COA', 'Coastal Line', [
  'Colombo Fort',
  'Kollupitiya',
  'Bambalapitiya',
  'Wellawatte',
  'Mount Lavinia',
])

const main = makeLine('MAI', 'Main Line', [
  'Colombo Fort',
  'Maradana',
  'Dematagoda',
  'Kelaniya',
  'Ragama',
])

describe('layoutMap', () => {
  it('draws a shared station once, as a larger interchange at the left', () => {
    const layout = layoutMap([coastal, main])

    expect(layout.hubs).toHaveLength(1)
    expect(layout.hubs[0]).toMatchObject({
      stationId: 'st-colombo-fort',
      name: 'Colombo Fort',
      x: 90,
    })
    expect(layout.lines.flatMap((line) => line.stations)).not.toContainEqual(
      expect.objectContaining({ stationId: 'st-colombo-fort' }),
    )
    expect(layout.stationPoints.get('st-colombo-fort')?.x).toBe(90)
    expect(layout.stationPoints.get('st-colombo-fort')?.name).toBe('Colombo Fort')
  })

  it('lays the first line above the second, with the stations in sequence order', () => {
    const layout = layoutMap([coastal, main])
    const [first, second] = layout.lines

    expect(first).toBeDefined()
    expect(second).toBeDefined()
    if (first === undefined || second === undefined) {
      return
    }

    expect(first.rowY).toBeLessThan(second.rowY)
    expect(first.stations.map((station) => station.name)).toEqual([
      'Kollupitiya',
      'Bambalapitiya',
      'Wellawatte',
      'Mount Lavinia',
    ])
    const xs = first.stations.map((station) => station.x)
    expect(xs).toEqual([...xs].sort((a, b) => a - b))
    expect(new Set(xs).size).toBe(xs.length)
  })

  it('alternates station labels above and below within a row', () => {
    const [first] = layoutMap([coastal, main]).lines

    expect(first?.stations.map((station) => station.labelSide)).toEqual([
      'above',
      'below',
      'above',
      'below',
    ])
  })

  it('fans out of the interchange and finishes on the last station of the line', () => {
    const layout = layoutMap([coastal, main])
    const hub = layout.hubs[0]
    const line = layout.lines[0]
    const last = line?.stations.at(-1)

    expect(hub).toBeDefined()
    expect(last).toBeDefined()
    if (hub === undefined || line === undefined || last === undefined) {
      return
    }

    expect(line.path.startsWith(`M ${hub.x} ${hub.y}`)).toBe(true)
    expect(line.path.endsWith(`L ${last.x} ${last.y}`)).toBe(true)
    expect(line.polyline[0]).toEqual({ x: hub.x, y: hub.y })
  })

  it('computes a viewBox that contains every station and row', () => {
    const layout = layoutMap([coastal, main])
    const lastX = Math.max(...layout.lines.flatMap((line) => line.stations.map((s) => s.x)))
    const lastRow = Math.max(...layout.lines.map((line) => line.rowY))

    expect(layout.width).toBeGreaterThan(lastX)
    expect(layout.height).toBeGreaterThan(lastRow)
    expect(layout.viewBox).toBe(`0 0 ${layout.width} ${layout.height}`)
  })

  it('grows with the network: three lines share evenly spaced rows', () => {
    const hill = makeLine('HIL', 'Hill Line', ['Colombo Fort', 'Kandy', 'Nanu Oya'])
    const layout = layoutMap([coastal, main, hill])
    const rows = layout.lines.map((line) => line.rowY)

    expect(rows).toHaveLength(3)
    expect(rows[1] - rows[0]).toBe(rows[2] - rows[1])
    expect(layout.hubs).toHaveLength(1)
    expect(layout.hubs[0]?.y).toBe((rows[0] + rows[2]) / 2)
    // A line beyond the design's two takes the additional palette tokens, by position.
    expect(layout.lines[2]?.colour).toBe('var(--line-3)')
  })

  it('keeps the design tokens for the two seeded line codes', () => {
    const layout = layoutMap([coastal, main])

    expect(layout.lines[0]?.colour).toBe('var(--line-coast)')
    expect(layout.lines[1]?.colour).toBe('var(--line-main)')
  })

  it('draws any network shape, without a station name or coordinate written in', () => {
    const custom = makeLine('XYZ', 'Test Line', ['Alpha', 'Beta'])
    const layout = layoutMap([custom])
    const line = layout.lines[0]

    expect(line?.stations.map((station) => station.name)).toEqual(['Alpha', 'Beta'])
    expect(layout.hubs).toEqual([])
    expect(line?.stations.map((station) => station.x)).toEqual([310, 430])
    expect(layout.viewBox).toMatch(/^0 0 \d+ \d+$/)
  })

  it('still returns a usable canvas when the network has no lines', () => {
    const layout = layoutMap([])

    expect(layout.lines).toEqual([])
    expect(layout.hubs).toEqual([])
    expect(layout.viewBox).toBe('0 0 640 360')
  })
})
