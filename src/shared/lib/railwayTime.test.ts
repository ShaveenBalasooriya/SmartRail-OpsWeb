import { describe, expect, it } from 'vitest'
import { railwayDateKey, serviceDateFromParam } from './railwayTime'

describe('serviceDateFromParam', () => {
  it('keeps a well-formed railway day from the URL', () => {
    expect(serviceDateFromParam('2026-10-23')).toBe('2026-10-23')
  })

  it.each([null, '', 'tomorrow', '2026-10-2', '2026-10-23T00:00'])(
    'falls back to today on the railway calendar for %j',
    (value) => {
      expect(serviceDateFromParam(value)).toBe(railwayDateKey(new Date()))
    },
  )
})
