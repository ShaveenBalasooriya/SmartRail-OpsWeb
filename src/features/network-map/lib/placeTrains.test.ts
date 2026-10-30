import { describe, expect, it } from 'vitest'
import type { Journey, JourneyStatus } from '@/features/journeys/types'
import type { Line } from '@/features/stations/types'
import { layoutMap, type StationPoint } from './layoutMap'
import { describeMap, placeTrains, type MapTrain } from './placeTrains'

function makeLine(
  code: string,
  name: string,
  stationNames: readonly string[],
  color = '#0f766e',
): Line {
  return {
    id: `line-${code.toLowerCase()}`,
    code,
    color,
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

const layout = layoutMap([coastal, main])

function station(id: string): StationPoint {
  const point = layout.stationPoints.get(id)
  if (point === undefined) {
    throw new Error(`The fixture network has no station ${id}.`)
  }
  return point
}

function journey(overrides: Partial<Journey> & Pick<Journey, 'id' | 'status'>): Journey {
  return {
    serviceName: 'Coastal Express',
    lineCode: 'COA',
    lineName: 'Coastal Line',
    direction: 'outbound',
    delayMinutes: 0,
    lastDepartedStation: null,
    nextStation: null,
    guardName: null,
    lastUpdatedAt: '2026-10-28T02:35:00Z',
    isStale: false,
    ...overrides,
  }
}

function onlyTrain(trains: readonly MapTrain[]): MapTrain {
  expect(trains).toHaveLength(1)
  const train = trains[0]
  if (train === undefined) {
    throw new Error('No train was placed.')
  }
  return train
}

function cardOf(train: MapTrain) {
  if (train.card === null) {
    throw new Error('The train has no card.')
  }
  return train.card
}

describe('placeTrains', () => {
  it('places a running train halfway between its last and next station', () => {
    const trains = placeTrains(
      [
        journey({
          id: 'j-run',
          status: 'running',
          delayMinutes: -2,
          lastDepartedStation: { id: 'st-kollupitiya', name: 'Kollupitiya' },
          nextStation: { id: 'st-bambalapitiya', name: 'Bambalapitiya' },
        }),
      ],
      layout,
    )
    const train = onlyTrain(trains)
    const from = station('st-kollupitiya')
    const to = station('st-bambalapitiya')

    expect(train.positionText).toBe('Between Kollupitiya and Bambalapitiya')
    expect(train.anchor).toEqual({ x: (from.x + to.x) / 2, y: from.y })
    expect(train.statusText).toBe('Running · 2 min early')
    expect(train.card).not.toBeNull()
    expect(train.staleText).toBeNull()
  })

  it('puts a running train with no next station at its last station', () => {
    const train = onlyTrain(
      placeTrains(
        [
          journey({
            id: 'j-at',
            status: 'running',
            delayMinutes: 0,
            lastDepartedStation: { id: 'st-mount-lavinia', name: 'Mount Lavinia' },
          }),
        ],
        layout,
      ),
    )
    const at = station('st-mount-lavinia')

    expect(train.positionText).toBe('At Mount Lavinia')
    expect(train.anchor).toEqual({ x: at.x, y: at.y })
    expect(train.statusText).toBe('Running · On time')
  })

  it('marks a terminated train at the station it ended at, with the terminated treatment', () => {
    const train = onlyTrain(
      placeTrains(
        [
          journey({
            id: 'j-end',
            status: 'terminated',
            delayMinutes: 8,
            lastDepartedStation: { id: 'st-mount-lavinia', name: 'Mount Lavinia' },
          }),
        ],
        layout,
      ),
    )
    const at = station('st-mount-lavinia')

    expect(train.positionText).toBe('Ended at Mount Lavinia')
    expect(train.anchor).toEqual({ x: at.x, y: at.y })
    expect(train.statusText).toBe('Terminated · ended here')
    // The card sits opposite the station's label, so its stem never crosses the name.
    expect(cardOf(train).side).toBe(at.labelSide === 'above' ? 'below' : 'above')
  })

  it('does not place scheduled, cancelled or completed journeys', () => {
    const statuses: JourneyStatus[] = ['scheduled', 'cancelled', 'completed']

    const trains = placeTrains(
      statuses.map((status) =>
        journey({
          id: `j-${status}`,
          status,
          lastDepartedStation: { id: 'st-kollupitiya', name: 'Kollupitiya' },
          nextStation: { id: 'st-bambalapitiya', name: 'Bambalapitiya' },
        }),
      ),
      layout,
    )

    expect(trains).toEqual([])
  })

  it('marks a stale train with the update time and a taller card', () => {
    const train = onlyTrain(
      placeTrains(
        [
          journey({
            id: 'j-stale',
            status: 'running',
            delayMinutes: 3,
            isStale: true,
            lastDepartedStation: { id: 'st-maradana', name: 'Maradana' },
            nextStation: { id: 'st-dematagoda', name: 'Dematagoda' },
            lineCode: 'MAI',
            lineName: 'Main Line',
          }),
        ],
        layout,
      ),
    )

    // 02:35Z is 08:05:00 on the railway clock.
    expect(train.staleText).toBe('Stale · updated 08:05:00')
    expect(cardOf(train).height).toBe(66)
    expect(train.statusText).toBe('Running · 3 min late')
  })

  it('stacks two trains on the same segment instead of drawing them on top of each other', () => {
    const segment = {
      lastDepartedStation: { id: 'st-kollupitiya', name: 'Kollupitiya' },
      nextStation: { id: 'st-bambalapitiya', name: 'Bambalapitiya' },
    }
    const trains = placeTrains(
      [
        journey({ id: 'j-one', status: 'running', ...segment }),
        journey({ id: 'j-two', status: 'running', ...segment }),
      ],
      layout,
    )

    expect(trains).toHaveLength(2)
    const first = trains[0]
    const second = trains[1]
    if (first === undefined || second === undefined) {
      return
    }

    expect(first.anchor).toEqual(second.anchor)
    expect(cardOf(second).y - cardOf(first).y).toBe(74)
    expect(cardOf(second).side).toBe(cardOf(first).side)
  })

  it('does not move a train when its direction changes', () => {
    const outbound = onlyTrain(
      placeTrains(
        [
          journey({
            id: 'j-out',
            status: 'running',
            direction: 'outbound',
            lastDepartedStation: { id: 'st-kollupitiya', name: 'Kollupitiya' },
            nextStation: { id: 'st-bambalapitiya', name: 'Bambalapitiya' },
          }),
        ],
        layout,
      ),
    )
    const inbound = onlyTrain(
      placeTrains(
        [
          journey({
            id: 'j-in',
            status: 'running',
            direction: 'inbound',
            lastDepartedStation: { id: 'st-kollupitiya', name: 'Kollupitiya' },
            nextStation: { id: 'st-bambalapitiya', name: 'Bambalapitiya' },
          }),
        ],
        layout,
      ),
    )

    expect(inbound.anchor).toEqual(outbound.anchor)
    expect(cardOf(inbound)).toEqual(cardOf(outbound))
  })

  it('keeps a train between the interchange and the first station on the drawn line', () => {
    const train = onlyTrain(
      placeTrains(
        [
          journey({
            id: 'j-fan',
            status: 'running',
            lineCode: 'MAI',
            lineName: 'Main Line',
            lastDepartedStation: { id: 'st-colombo-fort', name: 'Colombo Fort' },
            nextStation: { id: 'st-maradana', name: 'Maradana' },
          }),
        ],
        layout,
      ),
    )
    const anchor = train.anchor

    expect(anchor).not.toBeNull()
    if (anchor === null) {
      return
    }

    // The straight midpoint would be (200, 300), off the fan; the drawn line bends at x = 190.
    expect(anchor.x).toBeLessThan(190)
    expect(anchor.y).toBeGreaterThan(240)
  })

  it('lists a train whose station the map does not have, without a marker', () => {
    const train = onlyTrain(
      placeTrains(
        [
          journey({
            id: 'j-unknown',
            status: 'running',
            delayMinutes: 4,
            lastDepartedStation: { id: 'st-elsewhere', name: 'Elsewhere' },
            nextStation: { id: 'st-nowhere', name: 'Nowhere' },
          }),
        ],
        layout,
      ),
    )

    expect(train.anchor).toBeNull()
    expect(train.card).toBeNull()
    expect(train.positionText).toBe('Position not reported')
    expect(train.ariaText).toContain('position not reported')
  })

  it('describes the map from the same data, in the design sentence style', () => {
    const trains = placeTrains(
      [
        journey({
          id: 'j-one',
          status: 'running',
          serviceName: 'Coastal Express',
          delayMinutes: -2,
          lastDepartedStation: { id: 'st-kollupitiya', name: 'Kollupitiya' },
          nextStation: { id: 'st-bambalapitiya', name: 'Bambalapitiya' },
        }),
        journey({
          id: 'j-two',
          status: 'running',
          serviceName: 'Main Line Express',
          lineCode: 'MAI',
          lineName: 'Main Line',
          delayMinutes: 3,
          isStale: true,
          lastDepartedStation: { id: 'st-maradana', name: 'Maradana' },
          nextStation: { id: 'st-dematagoda', name: 'Dematagoda' },
        }),
        journey({
          id: 'j-three',
          status: 'terminated',
          serviceName: 'Mount Local',
          delayMinutes: 8,
          lastDepartedStation: { id: 'st-mount-lavinia', name: 'Mount Lavinia' },
          nextStation: null,
        }),
      ],
      layout,
    )

    expect(describeMap(trains)).toBe(
      'Schematic map. Coastal Express is between Kollupitiya and Bambalapitiya on the Coastal Line, 2 minutes early. ' +
        'Main Line Express is between Maradana and Dematagoda on the Main Line, 3 minutes late and stale. ' +
        'Mount Local terminated at Mount Lavinia on the Coastal Line.',
    )
  })

  it('says no trains are running when there are none to draw', () => {
    expect(describeMap([])).toBe('Schematic map. No trains are running.')
  })
})
