import { describe, expect, it } from 'vitest'
import { ApiError } from '@/shared/api/ApiError'
import { queryClient, shouldRetry } from './queryClient'

describe('shouldRetry', () => {
  it.each([
    [401, 'UNAUTHENTICATED'],
    [403, 'FORBIDDEN_ROLE'],
    [404, 'NOT_FOUND'],
  ] as const)(
    'does not retry HTTP %i on the first failure',
    (status, code) => {
      expect(shouldRetry(0, new ApiError(status, code, 'Request failed.'))).toBe(false)
    },
  )

  it.each([0, 1])('retries a 500 ApiError after %i failures', (failureCount) => {
    expect(shouldRetry(failureCount, new ApiError(500, 'UNKNOWN', 'Server error.'))).toBe(true)
  })

  it.each([0, 1])('retries a plain Error after %i failures', (failureCount) => {
    expect(shouldRetry(failureCount, new Error('Network down.'))).toBe(true)
  })

  it.each([
    ['a 500 ApiError', new ApiError(500, 'UNKNOWN', 'Server error.')],
    ['a plain Error', new Error('Network down.')],
  ])('stops retrying %s once two retries have failed', (_label, error) => {
    expect(shouldRetry(2, error)).toBe(false)
  })

  it('is the query retry default', () => {
    expect(queryClient.getDefaultOptions().queries?.retry).toBe(shouldRetry)
  })
})
