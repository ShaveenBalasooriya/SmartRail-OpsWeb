import { afterEach, describe, expect, it, vi } from 'vitest'
import { isMocked } from './mockSwitch'

describe('isMocked', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('mocks every group when no flag is set', () => {
    vi.stubEnv('VITE_USE_REAL_OPERATIONS', undefined)
    vi.stubEnv('VITE_USE_REAL_AUDIT', undefined)
    vi.stubEnv('VITE_USE_REAL_STREAM', undefined)

    expect(isMocked('operations')).toBe(true)
    expect(isMocked('audit')).toBe(true)
    expect(isMocked('stream')).toBe(true)
  })

  it('uses the real API for a group only when its flag is exactly "true"', () => {
    vi.stubEnv('VITE_USE_REAL_OPERATIONS', 'true')

    expect(isMocked('operations')).toBe(false)
  })

  it.each(['false', '', 'TRUE', '1', 'yes'])('keeps a group mocked when its flag is %j', (value) => {
    vi.stubEnv('VITE_USE_REAL_AUDIT', value)

    expect(isMocked('audit')).toBe(true)
  })

  it('reads each group from its own flag', () => {
    vi.stubEnv('VITE_USE_REAL_OPERATIONS', 'true')
    vi.stubEnv('VITE_USE_REAL_AUDIT', undefined)
    vi.stubEnv('VITE_USE_REAL_STREAM', 'true')

    expect(isMocked('operations')).toBe(false)
    expect(isMocked('audit')).toBe(true)
    expect(isMocked('stream')).toBe(false)
  })
})
