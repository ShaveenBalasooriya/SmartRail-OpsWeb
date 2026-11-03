import { describe, expect, it } from 'vitest'
import { ApiError } from '@/shared/api/ApiError'
import { publishErrorMessage } from './publishErrorMessage'

const FALLBACK = 'The change could not be published. Please try again.'

describe('publishErrorMessage', () => {
  it.each([
    [400, 'A delay must be between 1 and 720 minutes.'],
    [404, 'No journey was found for the given id.'],
    [409, 'That stop has already departed.'],
  ])('shows the API detail for HTTP %i verbatim', (status, detail) => {
    expect(publishErrorMessage(new ApiError(status, 'UNKNOWN', detail))).toBe(detail)
  })

  it('uses the role message for a 403 instead of the server text', () => {
    expect(publishErrorMessage(new ApiError(403, 'FORBIDDEN_ROLE', 'Forbidden'))).toBe(
      'You do not have permission to publish changes.',
    )
  })

  it.each([500, 503, 0])('falls back to the generic message for HTTP %i', (status) => {
    expect(publishErrorMessage(new ApiError(status, 'UNKNOWN', 'x'))).toBe(FALLBACK)
  })

  it('falls back for an error that is not an ApiError', () => {
    expect(publishErrorMessage(new Error('boom'))).toBe(FALLBACK)
    expect(publishErrorMessage(undefined)).toBe(FALLBACK)
  })
})
