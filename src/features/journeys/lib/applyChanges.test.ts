import { describe, expect, it } from 'vitest'
import type { PublishedChange } from '@/features/publishing/types'
import type { JourneyDetail, JourneyStop } from '../types'
import { appliedStatus, applyChanges } from './applyChanges'

const JOURNEY_ID = '0196f2a0-0000-7000-8000-000000000001'

function stop(overrides: Partial<JourneyStop> & Pick<JourneyStop, 'sequence'>): JourneyStop {
  return {
    stationId: 'st-galle',
    isCalling: true,
    scheduledArrival: null,
    scheduledDeparture: null,
    platformId: null,
    ...overrides,
  }
}

// Five stops: 1 origin (Kandy), 2 calling (Galle), 3 passes, 4 calling (Kandy), 5 final calling (Galle).
const journey: JourneyDetail = {
  id: JOURNEY_ID,
  serviceName: 'Kandy Express',
  lineCode: 'KDY',
  lineName: 'Main Line',
  direction: 'outbound',
  scheduledDepartureAt: '2026-10-21T02:30:00Z',
  status: 'running',
  serviceDate: '2026-10-21',
  stops: [
    stop({
      sequence: 1,
      stationId: 'st-kandy',
      scheduledDeparture: '2026-10-21T02:30:00Z',
      platformId: 'pl-kandy-2',
    }),
    stop({
      sequence: 2,
      scheduledArrival: '2026-10-21T02:40:00Z',
      scheduledDeparture: '2026-10-21T02:41:00Z',
      platformId: 'pl-galle-1',
    }),
    stop({ sequence: 3, isCalling: false, stationId: 'st-passing' }),
    stop({
      sequence: 4,
      stationId: 'st-kandy',
      scheduledArrival: '2026-10-21T03:00:00Z',
      scheduledDeparture: '2026-10-21T03:01:00Z',
      platformId: 'pl-kandy-2',
    }),
    stop({ sequence: 5, scheduledArrival: '2026-10-21T03:30:00Z' }),
  ],
}

// A change with the fields every published change carries. Each test sets only what it is about.
function change(
  overrides: Partial<PublishedChange> & Pick<PublishedChange, 'type' | 'values'>,
): PublishedChange {
  return {
    id: `c-${overrides.type}-${overrides.publishedAt ?? '0240'}`,
    journeyId: JOURNEY_ID,
    publishedBy: 'Dev Network Controller',
    publishedAt: '2026-10-21T02:40:00Z',
    provenance: 'automatically_published',
    correctedByChangeId: null,
    correctsChangeId: null,
    ...overrides,
  }
}

function delay(fromSequence: number, minutes: number, publishedAt = '2026-10-21T02:40:00Z'): PublishedChange {
  return change({ type: 'delay', values: { fromSequence, minutes }, publishedAt })
}

function termination(lastStopSequence: number, publishedAt = '2026-10-21T02:45:00Z'): PublishedChange {
  return change({ type: 'termination', values: { lastStopSequence }, publishedAt })
}

function platformChange(sequence: number, platformId: string, publishedAt: string): PublishedChange {
  return change({ type: 'platform_change', values: { sequence, platformId }, publishedAt })
}

function bySequence(view: ReturnType<typeof applyChanges>, sequence: number) {
  const row = view.stops.find((item) => item.sequence === sequence)
  if (row === undefined) {
    throw new Error(`No stop ${sequence} in the view.`)
  }
  return row
}

describe('applyChanges', () => {
  it('leaves every stop on its schedule, with no expected time, when nothing was published', () => {
    const view = applyChanges(journey, [])

    expect(view.status).toBe('running')
    expect(view.stops.every((row) => row.expectedArrival === null && row.expectedDeparture === null)).toBe(true)
    expect(view.stops.every((row) => row.isServed && row.platformChangedAt === null)).toBe(true)
  })

  it('moves a delay from a middle stop and every later stop, and leaves the earlier stops alone', () => {
    const view = applyChanges(journey, [delay(2, 15)])

    expect(bySequence(view, 1).expectedDeparture).toBeNull()
    expect(bySequence(view, 2)).toMatchObject({
      expectedArrival: '2026-10-21T02:55:00.000Z',
      expectedDeparture: '2026-10-21T02:56:00.000Z',
    })
    expect(bySequence(view, 4)).toMatchObject({
      expectedArrival: '2026-10-21T03:15:00.000Z',
      expectedDeparture: '2026-10-21T03:16:00.000Z',
    })
    expect(bySequence(view, 5).expectedArrival).toBe('2026-10-21T03:45:00.000Z')
  })

  it('keeps the scheduled times on every stop, whatever the delay', () => {
    const view = applyChanges(journey, [delay(2, 15)])

    expect(bySequence(view, 2)).toMatchObject({
      scheduledArrival: '2026-10-21T02:40:00Z',
      scheduledDeparture: '2026-10-21T02:41:00Z',
    })
  })

  it('does not give a passing stop an expected time, even when a delay covers it', () => {
    const view = applyChanges(journey, [delay(1, 5)])

    expect(bySequence(view, 3)).toMatchObject({ isCalling: false, expectedArrival: null, expectedDeparture: null })
  })

  it('lets the latest delay covering a stop win, and does not add two delays together', () => {
    const view = applyChanges(journey, [delay(2, 15, '2026-10-21T02:40:00Z'), delay(4, 5, '2026-10-21T02:50:00Z')])

    expect(bySequence(view, 2).expectedDeparture).toBe('2026-10-21T02:56:00.000Z')
    expect(bySequence(view, 4).expectedDeparture).toBe('2026-10-21T03:06:00.000Z')
  })

  it('takes the later publish time when two delays cover the same stop, whatever order they arrive in', () => {
    const later = delay(2, 10, '2026-10-21T02:50:00Z')
    const earlier = delay(2, 15, '2026-10-21T02:40:00Z')

    const view = applyChanges(journey, [later, earlier])

    expect(bySequence(view, 2).expectedDeparture).toBe('2026-10-21T02:51:00.000Z')
  })

  it('reads a delay whose numbers arrived as text', () => {
    const view = applyChanges(journey, [change({ type: 'delay', values: { fromSequence: '2', minutes: '15' } })])

    expect(bySequence(view, 2).expectedDeparture).toBe('2026-10-21T02:56:00.000Z')
  })

  it('ignores a delay whose values are not whole numbers', () => {
    const view = applyChanges(journey, [change({ type: 'delay', values: { fromSequence: 2, minutes: 'late' } })])

    expect(bySequence(view, 2).expectedDeparture).toBeNull()
  })

  it('sets the platform of the stop, with the publish time it became known', () => {
    const view = applyChanges(journey, [platformChange(2, 'pl-galle-9', '2026-10-21T02:45:00Z')])

    expect(bySequence(view, 2)).toMatchObject({
      platformId: 'pl-galle-9',
      platformChangedAt: '2026-10-21T02:45:00Z',
    })
    expect(bySequence(view, 1)).toMatchObject({ platformId: 'pl-kandy-2', platformChangedAt: null })
  })

  it('uses the latest platform change for a stop, whatever order they arrive in', () => {
    const view = applyChanges(journey, [
      platformChange(1, 'pl-kandy-4', '2026-10-21T02:50:00Z'),
      platformChange(1, 'pl-kandy-3', '2026-10-21T02:45:00Z'),
    ])

    expect(bySequence(view, 1)).toMatchObject({
      platformId: 'pl-kandy-4',
      platformChangedAt: '2026-10-21T02:50:00Z',
    })
  })

  it('ends the journey at the termination, and stops after its last stop are not served', () => {
    const view = applyChanges(journey, [delay(1, 10), termination(2)])

    expect(view.status).toBe('terminated')
    expect(bySequence(view, 2)).toMatchObject({ isServed: true, expectedDeparture: '2026-10-21T02:51:00.000Z' })
    for (const sequence of [3, 4, 5]) {
      expect(bySequence(view, sequence)).toMatchObject({
        isServed: false,
        expectedArrival: null,
        expectedDeparture: null,
      })
    }
  })

  it('keeps the scheduled times of stops after a termination', () => {
    const view = applyChanges(journey, [termination(2)])

    expect(bySequence(view, 5)).toMatchObject({ scheduledArrival: '2026-10-21T03:30:00Z' })
  })

  it('cancels every stop of a cancelled journey, with no expected time', () => {
    const view = applyChanges(journey, [
      delay(1, 10),
      change({ type: 'cancellation', values: {}, publishedAt: '2026-10-21T02:35:00Z' }),
    ])

    expect(view.status).toBe('cancelled')
    expect(view.stops.every((row) => !row.isServed)).toBe(true)
    expect(view.stops.every((row) => row.expectedArrival === null && row.expectedDeparture === null)).toBe(true)
  })

  it('ignores a corrected delay, so it has no effect', () => {
    const corrected = { ...delay(2, 30), correctedByChangeId: 'c-correction' }

    const view = applyChanges(journey, [corrected])

    expect(bySequence(view, 2).expectedDeparture).toBeNull()
  })

  it('ignores a corrected platform change, so the stop keeps its timetable platform', () => {
    const corrected = { ...platformChange(1, 'pl-kandy-9', '2026-10-21T02:45:00Z'), correctedByChangeId: 'c-x' }

    const view = applyChanges(journey, [corrected])

    expect(bySequence(view, 1)).toMatchObject({ platformId: 'pl-kandy-2', platformChangedAt: null })
  })

  it('ignores a corrected termination, so the journey is running and every stop is served', () => {
    const corrected = { ...termination(2), correctedByChangeId: 'c-correction' }

    const view = applyChanges(journey, [corrected])

    expect(view.status).toBe('running')
    expect(view.stops.every((row) => row.isServed)).toBe(true)
  })

  it('ignores a corrected cancellation, so the journey is not cancelled', () => {
    const corrected = {
      ...change({ type: 'cancellation', values: {} }),
      correctedByChangeId: 'c-correction',
    }

    expect(applyChanges(journey, [corrected]).status).toBe('running')
  })

  it('lets a correction contribute nothing, and leaves the state it corrected', () => {
    const correction = change({
      type: 'correction',
      values: {},
      correctsChangeId: 'c-original',
      publishedAt: '2026-10-21T02:50:00Z',
    })

    const view = applyChanges(journey, [correction])

    expect(view.status).toBe('running')
    expect(view.stops.every((row) => row.expectedDeparture === null)).toBe(true)
  })

  it('does not reorder or change the stops it was given', () => {
    const stops = [...journey.stops].reverse()

    applyChanges({ ...journey, stops }, [delay(2, 15)])

    expect(stops.map((item) => item.sequence)).toEqual([5, 4, 3, 2, 1])
    expect(stops.every((item) => !('expectedArrival' in item))).toBe(true)
  })

  it('returns the stops in sequence order', () => {
    const view = applyChanges({ ...journey, stops: [...journey.stops].reverse() }, [])

    expect(view.stops.map((row) => row.sequence)).toEqual([1, 2, 3, 4, 5])
  })

  it('keeps a null base status null when no change sets the status', () => {
    expect(applyChanges({ ...journey, status: null }, [delay(2, 5)]).status).toBeNull()
  })
})

describe('appliedStatus', () => {
  it('returns the base status when no change applies to the status', () => {
    expect(appliedStatus('running', [delay(2, 5)])).toBe('running')
    expect(appliedStatus('scheduled', [])).toBe('scheduled')
  })

  it('returns null for a journey whose status is not reported and has no status change', () => {
    expect(appliedStatus(null, [delay(2, 5)])).toBeNull()
  })

  it('is cancelled after a cancellation, whatever the base status', () => {
    const cancellation = change({ type: 'cancellation', values: {} })

    expect(appliedStatus(null, [cancellation])).toBe('cancelled')
    expect(appliedStatus('scheduled', [cancellation])).toBe('cancelled')
  })

  it('is terminated after an early termination', () => {
    expect(appliedStatus('running', [termination(2)])).toBe('terminated')
  })

  it('gives a cancellation precedence over a termination if both are live', () => {
    const cancellation = change({ type: 'cancellation', values: {}, publishedAt: '2026-10-21T02:30:00Z' })

    expect(appliedStatus('running', [termination(2), cancellation])).toBe('cancelled')
  })
})
