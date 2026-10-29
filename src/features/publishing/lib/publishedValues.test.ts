import { describe, expect, it } from 'vitest'
import type { JourneyStop } from '@/features/journeys/types'
import type { Station } from '@/features/stations/types'
import type { PublishedChange } from '../types'
import {
  platformNumbersOfStations,
  publishedValueRows,
  stopLabelsOf,
} from './publishedValues'

const stops: JourneyStop[] = [
  {
    sequence: 2,
    stationId: 'st-gampaha',
    stationName: 'Gampaha',
    isCalling: true,
    scheduledArrival: null,
    scheduledDeparture: null,
    expectedArrival: null,
    expectedDeparture: null,
    actualDeparture: null,
    platformId: 'pl-gampaha-2',
    platformNumber: '2',
  },
]

const labels = stopLabelsOf(stops)

function change(overrides: Partial<PublishedChange>): PublishedChange {
  return {
    id: 'c-1',
    type: 'delay',
    values: {},
    publisherName: 'Mahesh Perera',
    publishedAt: '2026-10-28T02:34:00Z',
    provenance: 'automatically_published',
    corrected: false,
    ...overrides,
  }
}

describe('stopLabelsOf', () => {
  it('labels a stop by sequence and station name, with a visible fallback', () => {
    expect(labels.get(2)).toBe('Stop 2: Gampaha')
    expect(stopLabelsOf([{ ...stops[0], sequence: 3, stationName: null } as JourneyStop]).get(3)).toBe(
      'Stop 3: Unknown station',
    )
  })
})

describe('publishedValueRows', () => {
  it('describes a published delay in its own terms', () => {
    const rows = publishedValueRows(
      change({ values: { fromStopSequence: '2', minutes: '6' } }),
      labels,
      new Map(),
    )

    expect(rows).toEqual([
      { label: 'Starts at', value: 'Stop 2: Gampaha' },
      { label: 'Delay', value: '6 min' },
    ])
  })

  it('resolves a platform change to the platform number', () => {
    const rows = publishedValueRows(
      change({ type: 'platform_change', values: { stopSequence: '2', platformId: 'pl-gampaha-3' } }),
      labels,
      new Map([['pl-gampaha-3', '3']]),
    )

    expect(rows).toEqual([
      { label: 'Stop', value: 'Stop 2: Gampaha' },
      { label: 'Platform', value: '3' },
    ])
  })

  it('falls back to the platform id when the number is unknown, and a dash when a value is missing', () => {
    const rows = publishedValueRows(
      change({ type: 'platform_change', values: { stopSequence: '9', platformId: 'pl-unknown' } }),
      labels,
      new Map(),
    )

    expect(rows).toEqual([
      { label: 'Stop', value: 'Stop 9' },
      { label: 'Platform', value: 'pl-unknown' },
    ])
    expect(publishedValueRows(change({ type: 'delay' }), labels, new Map())[1]).toEqual({
      label: 'Delay',
      value: '— min',
    })
  })

  it('describes a cancellation and a termination', () => {
    expect(publishedValueRows(change({ type: 'cancellation' }), labels, new Map())).toEqual([
      { label: 'Journey', value: 'Cancelled' },
    ])
    expect(
      publishedValueRows(change({ type: 'termination', values: { lastStopSequence: '2' } }), labels, new Map()),
    ).toEqual([{ label: 'Last stop served', value: 'Stop 2: Gampaha' }])
  })
})

describe('platformNumbersOfStations', () => {
  const stations: Station[] = [
    {
      id: 'st-gampaha',
      code: 'GPH',
      name: 'Gampaha',
      isInterchange: false,
      platforms: [
        { id: 'pl-gampaha-2', stationId: 'st-gampaha', number: '2' },
        { id: 'pl-gampaha-3', stationId: 'st-gampaha', number: '3' },
      ],
      lines: [],
    },
  ]

  it('maps every platform id in the reference data to its number', () => {
    expect([...platformNumbersOfStations(stations)]).toEqual([
      ['pl-gampaha-2', '2'],
      ['pl-gampaha-3', '3'],
    ])
  })
})
