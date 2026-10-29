import { describe, expect, it } from 'vitest'
import { formatRailwayDateTime, railwayLocalToIso } from './railwayTime'

describe('formatRailwayDateTime', () => {
  it('shows the date and time in the railway zone, not the viewer zone', () => {
    expect(formatRailwayDateTime('2026-10-28T09:00:00Z')).toBe('28 Oct 2026, 14:30')
  })
})

describe('railwayLocalToIso', () => {
  it('reads a datetime-local value as railway wall-clock time', () => {
    expect(railwayLocalToIso('2026-10-28T09:00')).toBe('2026-10-28T03:30:00.000Z')
  })

  it('keeps seconds when the input has them', () => {
    expect(railwayLocalToIso('2026-10-28T09:00:30')).toBe('2026-10-28T03:30:30.000Z')
  })
})
