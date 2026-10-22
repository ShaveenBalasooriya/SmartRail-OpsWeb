import { beforeEach, describe, expect, it } from 'vitest'
import { ApiError } from '@/shared/api/ApiError'
import {
  failNextMockCall,
  mockPublishCancellation,
  mockPublishDelay,
  mockPublishPlatformChange,
  setMockLatency,
} from './publish.mock'

const JOURNEY_ID = '0196f2a0-0000-7000-8000-000000000001'

async function failureOf(promise: Promise<unknown>): Promise<ApiError> {
  const error: unknown = await promise.then(
    () => {
      throw new Error('Expected the mock to reject.')
    },
    (reason: unknown) => reason,
  )
  expect(error).toBeInstanceOf(ApiError)
  return error as ApiError
}

describe('publish mock', () => {
  beforeEach(() => {
    setMockLatency(0)
  })

  it('returns an automatically published delay with the publisher and the publish time', async () => {
    const before = Date.now()

    const change = await mockPublishDelay(JOURNEY_ID, { fromSequence: 3, minutes: 15 })

    expect(change).toMatchObject({
      type: 'delay',
      journeyId: JOURNEY_ID,
      values: { fromSequence: 3, minutes: 15 },
      publishedBy: 'Dev Network Controller',
      provenance: 'automatically_published',
      correctedByChangeId: null,
      correctsChangeId: null,
    })
    expect(change.id).not.toBe('')
    expect(Date.parse(change.publishedAt)).toBeGreaterThanOrEqual(before)
  })

  it.each([0, 721, 1.5, Number.NaN])('rejects a delay of %p minutes as a validation error', async (minutes) => {
    const failure = await failureOf(mockPublishDelay(JOURNEY_ID, { fromSequence: 3, minutes }))

    expect(failure).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
  })

  it('accepts a delay at the bounds 1 and 720', async () => {
    await expect(mockPublishDelay(JOURNEY_ID, { fromSequence: 3, minutes: 1 })).resolves.toBeDefined()
    await expect(mockPublishDelay(JOURNEY_ID, { fromSequence: 3, minutes: 720 })).resolves.toBeDefined()
  })

  it('answers a missing journey id with not found', async () => {
    const failure = await failureOf(mockPublishCancellation(''))

    expect(failure).toMatchObject({ status: 404, code: 'NOT_FOUND' })
  })

  it('rejects a platform change with no platform as a validation error', async () => {
    const failure = await failureOf(mockPublishPlatformChange(JOURNEY_ID, { sequence: 2, platformId: ' ' }))

    expect(failure).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
  })

  it('returns a cancellation with no values', async () => {
    const change = await mockPublishCancellation(JOURNEY_ID)

    expect(change).toMatchObject({ type: 'cancellation', values: {}, provenance: 'automatically_published' })
  })

  it('fails the next call with the given error, then goes back to normal', async () => {
    failNextMockCall(new ApiError(403, 'FORBIDDEN_ROLE', 'Not allowed.'))

    const failure = await failureOf(mockPublishCancellation(JOURNEY_ID))
    expect(failure).toMatchObject({ status: 403, message: 'Not allowed.' })

    await expect(mockPublishCancellation(JOURNEY_ID)).resolves.toMatchObject({ type: 'cancellation' })
  })
})
