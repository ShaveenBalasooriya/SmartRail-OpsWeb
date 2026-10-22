import { describe, expect, it } from 'vitest'
import { apiErrorCodeFor, isProblemDetailsBody } from './ApiError'

describe('apiErrorCodeFor', () => {
  it.each([
    [400, 'VALIDATION_ERROR'],
    [401, 'UNAUTHENTICATED'],
    [403, 'FORBIDDEN_ROLE'],
    [404, 'NOT_FOUND'],
    [409, 'CONFLICT'],
    [500, 'UNKNOWN'],
  ] as const)('maps HTTP %i to %s', (status, code) => {
    expect(apiErrorCodeFor(status)).toBe(code)
  })
})

describe('isProblemDetailsBody', () => {
  it('accepts a problem-details body with the optional fields', () => {
    expect(
      isProblemDetailsBody({ title: 'x', detail: 'y', traceId: 'z', errors: { date: ['bad'] } }),
    ).toBe(true)
  })

  it.each([
    ['null', null],
    ['an array', ['title']],
    ['a string', 'The request is invalid.'],
    ['a non-string detail', { detail: 42 }],
    ['field errors that are not string lists', { errors: { date: 'bad' } }],
  ])('rejects %s', (_label, value) => {
    expect(isProblemDetailsBody(value)).toBe(false)
  })
})
