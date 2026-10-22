import { describe, expect, it } from 'vitest'
import { ApiError } from '@/shared/api/ApiError'
import { publishErrorMessage } from './publishErrorMessage'

const FALLBACK = 'The change could not be published. Please try again.'

describe('publishErrorMessage', () => {
  it.each([
    [400, 'The change is not valid. Check the values and try again.'],
    [403, 'You do not have permission to publish changes.'],
    [404, 'This journey could not be found.'],
  ])('maps HTTP %i to its user message', (status, message) => {
    expect(publishErrorMessage(new ApiError(status, 'UNKNOWN', 'server text'))).toBe(message)
  })

  it('shows the server message for a conflict, since it says what is wrong', () => {
    expect(
      publishErrorMessage(new ApiError(409, 'CONFLICT', 'That stop has already departed.')),
    ).toBe('That stop has already departed.')
  })

  it.each([500, 503, 0])('falls back to the generic message for HTTP %i', (status) => {
    expect(publishErrorMessage(new ApiError(status, 'UNKNOWN', 'x'))).toBe(FALLBACK)
  })

  it('falls back for an error that is not an ApiError', () => {
    expect(publishErrorMessage(new Error('boom'))).toBe(FALLBACK)
    expect(publishErrorMessage(undefined)).toBe(FALLBACK)
  })
})
