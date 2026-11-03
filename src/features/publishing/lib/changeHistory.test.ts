import { describe, expect, it } from 'vitest'
import type { JourneyStatus } from '@/features/journeys/types'
import type { PublishedChange } from '../types'
import { toChangeViews } from './changeHistory'

const platformNumbers = new Map([
  ['pl-kandy-3', '3'],
  ['pl-kandy-9', '9'],
])

function change(overrides: Partial<PublishedChange> & Pick<PublishedChange, 'id' | 'type'>): PublishedChange {
  return {
    values: {},
    publisherName: 'Nimalka Silva',
    publishedAt: '2026-10-28T02:40:00Z',
    provenance: 'automatically_published',
    corrected: false,
    ...overrides,
  }
}

function views(changes: PublishedChange[], status: JourneyStatus = 'running') {
  return toChangeViews(changes, platformNumbers, status)
}

describe('toChangeViews', () => {
  it('describes a delay by its minutes and its starting stop', () => {
    const [view] = views([
      change({ id: 'c1', type: 'delay', values: { fromStopSequence: '2', minutes: '15' } }),
    ])

    expect(view).toMatchObject({
      type: 'delay',
      typeLabel: 'Delay',
      summary: 'Delay of 15 minutes from stop 2',
      publisher: 'Nimalka Silva',
      provenanceLabel: 'Automatically published',
      isCorrected: false,
      correctsChangeId: null,
      original: null,
      correctedBy: null,
    })
  })

  it('describes a cancellation and a termination the way the design words them', () => {
    const result = views([
      change({ id: 'c1', type: 'cancellation' }),
      change({
        id: 'c2',
        type: 'termination',
        values: { lastStopSequence: '3' },
        publishedAt: '2026-10-28T02:50:00Z',
      }),
    ])

    expect(result.map((view) => [view.typeLabel, view.summary])).toEqual([
      ['Early termination', 'Ends at stop 3'],
      ['Cancellation', 'Cancelled'],
    ])
  })

  it('describes a platform change by the platform number the journey stops carry', () => {
    const [view] = views([
      change({ id: 'c1', type: 'platform_change', values: { stopSequence: '4', platformId: 'pl-kandy-3' } }),
    ])

    expect(view?.summary).toBe('Stop 4 moves to platform 3')
  })

  it('says unknown for a platform the journey stops do not name', () => {
    const [view] = views([
      change({ id: 'c1', type: 'platform_change', values: { stopSequence: '4', platformId: 'pl-gone' } }),
    ])

    expect(view?.summary).toBe('Stop 4 moves to platform unknown')
  })

  it('shows a dash for a value the server did not send', () => {
    const [view] = views([change({ id: 'c1', type: 'delay', values: {} })])

    expect(view?.summary).toBe('Delay of — minutes from stop —')
  })

  it('shows a fallback publisher when the API reports none', () => {
    const [view] = views([change({ id: 'c1', type: 'cancellation', publisherName: null })])

    expect(view?.publisher).toBe('Unknown publisher')
  })

  it('words a correction with the publish time of the change it reverts and links both ways', () => {
    const result = views([
      change({
        id: 'c-delay',
        type: 'delay',
        values: { fromStopSequence: '2', minutes: '15' },
        // 02:40Z is 08:10 on the railway clock.
        publishedAt: '2026-10-28T02:40:00Z',
        corrected: true,
      }),
      change({
        id: 'c-correction',
        type: 'correction',
        values: { correctsChangeId: 'c-delay' },
        // 02:50Z is 08:20 on the railway clock.
        publishedAt: '2026-10-28T02:50:00Z',
      }),
    ])

    const delay = result.find((view) => view.id === 'c-delay')
    const correction = result.find((view) => view.id === 'c-correction')

    expect(correction?.summary).toBe('Reverts the change published at 08:10')
    expect(correction?.original).toEqual({ id: 'c-delay', label: 'Delay at 08:10' })
    expect(delay?.correctedBy).toEqual({ id: 'c-correction', label: 'Correction at 08:20' })
  })

  it('falls back to a general wording when the reverted change is not in the history', () => {
    const [view] = views([
      change({ id: 'c1', type: 'correction', values: { correctsChangeId: 'c-missing' } }),
    ])

    expect(view?.summary).toBe('Reverts an earlier change')
    expect(view?.original).toBeNull()
  })

  it('does not link back from a change the API has not marked corrected', () => {
    const result = views([
      change({ id: 'c-delay', type: 'delay', values: { fromStopSequence: '1', minutes: '5' } }),
      change({
        id: 'c-correction',
        type: 'correction',
        values: { correctsChangeId: 'c-delay' },
        publishedAt: '2026-10-28T02:50:00Z',
      }),
    ])

    expect(result.find((view) => view.id === 'c-delay')?.correctedBy).toBeNull()
  })

  it('lists the newest change first, whatever order the changes arrive in', () => {
    const result = views([
      change({ id: 'old', type: 'cancellation', publishedAt: '2026-10-28T02:30:00Z' }),
      change({
        id: 'new',
        type: 'delay',
        values: { fromStopSequence: '2', minutes: '5' },
        publishedAt: '2026-10-28T02:50:00Z',
      }),
      change({
        id: 'mid',
        type: 'platform_change',
        values: { stopSequence: '1', platformId: 'pl-kandy-3' },
        publishedAt: '2026-10-28T02:40:00Z',
      }),
    ])

    expect(result.map((view) => view.id)).toEqual(['new', 'mid', 'old'])
  })

  it('does not reorder the changes it was given', () => {
    const changes = [
      change({ id: 'old', type: 'cancellation', publishedAt: '2026-10-28T02:30:00Z' }),
      change({ id: 'new', type: 'cancellation', publishedAt: '2026-10-28T02:50:00Z' }),
    ]

    views(changes)

    expect(changes.map((item) => item.id)).toEqual(['old', 'new'])
  })

  it('returns no views for a journey with no changes', () => {
    expect(views([])).toEqual([])
  })

  describe('correctability', () => {
    // The server accepts a correction on every status it can report except completed.
    it.each<JourneyStatus>(['scheduled', 'running', 'cancelled', 'terminated'])(
      'offers a correction on an open change while the journey is %s',
      (status) => {
        const [view] = views([change({ id: 'c1', type: 'delay' })], status)

        expect(view?.isCorrectable).toBe(true)
      },
    )

    it('offers no correction once the journey is completed', () => {
      const [view] = views([change({ id: 'c1', type: 'delay' })], 'completed')

      expect(view?.isCorrectable).toBe(false)
    })

    it('offers no correction on a change that is already corrected', () => {
      const [view] = views([change({ id: 'c1', type: 'delay', corrected: true })])

      expect(view?.isCorrectable).toBe(false)
    })

    it('offers no correction on a correction itself', () => {
      const [view] = views([
        change({ id: 'c1', type: 'correction', values: { correctsChangeId: 'c0' } }),
      ])

      expect(view?.isCorrectable).toBe(false)
    })
  })
})
