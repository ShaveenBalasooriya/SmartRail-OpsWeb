import { describe, expect, it } from 'vitest'
import { publishedNoticeFrom, publishedNoticeText } from './publishedNotice'

describe('publishedNoticeFrom', () => {
  it('reads a valid published notice from router state', () => {
    expect(
      publishedNoticeFrom({ published: { type: 'delay', publishedAt: '2026-10-21T02:40:00Z' } }),
    ).toEqual({ type: 'delay', publishedAt: '2026-10-21T02:40:00Z' })
  })

  it.each([
    ['no state', null],
    ['a state without the published key', { other: true }],
    ['a published value that is not an object', { published: 'delay' }],
    ['an unknown change type', { published: { type: 'teleport', publishedAt: '2026-10-21T02:40:00Z' } }],
    ['a missing time', { published: { type: 'delay' } }],
    ['an unreadable time', { published: { type: 'delay', publishedAt: 'not a time' } }],
  ])('rejects %s', (_label, state) => {
    expect(publishedNoticeFrom(state)).toBeNull()
  })
})

describe('publishedNoticeText', () => {
  it('names the change type and gives the time in railway time', () => {
    // 02:40Z is 08:10 on the railway clock (UTC+05:30).
    expect(publishedNoticeText({ type: 'delay', publishedAt: '2026-10-21T02:40:00Z' })).toBe(
      'Delay published at 08:10',
    )
    expect(publishedNoticeText({ type: 'platform_change', publishedAt: '2026-10-21T02:40:00Z' })).toBe(
      'Platform change published at 08:10',
    )
  })
})
