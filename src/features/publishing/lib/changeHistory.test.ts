import { describe, expect, it } from 'vitest'
import { indexStations } from '@/features/stations/lib/stationLookup'
import type { Station } from '@/features/stations/types'
import type { PublishedChange } from '../types'
import { toChangeViews } from './changeHistory'

const JOURNEY_ID = '0196f2a0-0000-7000-8000-000000000001'

const stations: Station[] = [
  {
    id: 'st-kandy',
    code: 'KDY',
    name: 'Kandy',
    isInterchange: true,
    platforms: [{ id: 'pl-kandy-3', stationId: 'st-kandy', number: '3' }],
    lines: [],
  },
]

const index = indexStations(stations)

function change(overrides: Partial<PublishedChange> & Pick<PublishedChange, 'id' | 'type'>): PublishedChange {
  return {
    journeyId: JOURNEY_ID,
    values: {},
    publishedBy: 'Dev Network Controller',
    publishedAt: '2026-10-21T02:40:00Z',
    provenance: 'automatically_published',
    correctedByChangeId: null,
    correctsChangeId: null,
    ...overrides,
  }
}

describe('toChangeViews', () => {
  it('describes a delay by its minutes and its starting stop', () => {
    const [view] = toChangeViews(
      [change({ id: 'c1', type: 'delay', values: { fromSequence: 2, minutes: 15 } })],
      index,
    )

    expect(view).toMatchObject({
      typeLabel: 'Delay',
      summary: 'Delay of 15 minutes from stop 2',
      publisher: 'Dev Network Controller',
      provenanceLabel: 'Automatically published',
      isCorrected: false,
    })
  })

  it('describes a cancellation and a termination in words', () => {
    const views = toChangeViews(
      [
        change({ id: 'c1', type: 'cancellation' }),
        change({ id: 'c2', type: 'termination', values: { lastStopSequence: 3 }, publishedAt: '2026-10-21T02:50:00Z' }),
      ],
      index,
    )

    expect(views.map((view) => [view.typeLabel, view.summary])).toEqual([
      ['Early termination', 'Last stop served: stop 3'],
      ['Cancellation', 'Journey cancelled'],
    ])
  })

  it('describes a platform change by the platform number of the new platform', () => {
    const [view] = toChangeViews(
      [change({ id: 'c1', type: 'platform_change', values: { sequence: 4, platformId: 'pl-kandy-3' } })],
      index,
    )

    expect(view?.summary).toBe('Stop 4 moves to platform 3')
  })

  it('says unknown for a platform the reference data does not have', () => {
    const [view] = toChangeViews(
      [change({ id: 'c1', type: 'platform_change', values: { sequence: 4, platformId: 'pl-gone' } })],
      index,
    )

    expect(view?.summary).toBe('Stop 4 moves to platform unknown')
  })

  it('shows a dash for a value the server did not send', () => {
    const [view] = toChangeViews([change({ id: 'c1', type: 'delay', values: {} })], index)

    expect(view?.summary).toBe('Delay of — minutes from stop —')
  })

  it('describes a correction that reverts an earlier change, and marks corrected changes', () => {
    const views = toChangeViews(
      [
        change({ id: 'c1', type: 'correction', correctsChangeId: 'c0' }),
        change({ id: 'c2', type: 'delay', values: { fromSequence: 1, minutes: 5 }, correctedByChangeId: 'c1' }),
      ],
      index,
    )

    expect(views.find((view) => view.id === 'c1')?.summary).toBe('Reverts an earlier change')
    expect(views.find((view) => view.id === 'c2')?.isCorrected).toBe(true)
  })

  it('lists the newest change first, whatever order the changes arrive in', () => {
    const views = toChangeViews(
      [
        change({ id: 'old', type: 'cancellation', publishedAt: '2026-10-21T02:30:00Z' }),
        change({ id: 'new', type: 'delay', values: { fromSequence: 2, minutes: 5 }, publishedAt: '2026-10-21T02:50:00Z' }),
        change({ id: 'mid', type: 'platform_change', values: { sequence: 1, platformId: 'pl-kandy-3' }, publishedAt: '2026-10-21T02:40:00Z' }),
      ],
      index,
    )

    expect(views.map((view) => view.id)).toEqual(['new', 'mid', 'old'])
  })

  it('does not reorder the changes it was given', () => {
    const changes = [
      change({ id: 'old', type: 'cancellation', publishedAt: '2026-10-21T02:30:00Z' }),
      change({ id: 'new', type: 'cancellation', publishedAt: '2026-10-21T02:50:00Z' }),
    ]

    toChangeViews(changes, index)

    expect(changes.map((item) => item.id)).toEqual(['old', 'new'])
  })

  it('returns no views for a journey with no changes', () => {
    expect(toChangeViews([], index)).toEqual([])
  })
})
