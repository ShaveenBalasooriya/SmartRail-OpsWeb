import { beforeEach, describe, expect, it } from 'vitest'
import { ApiError } from '@/shared/api/ApiError'
import {
  failNextMockCall,
  mockPublishCancellation,
  mockPublishDelay,
  mockPublishPlatformChange,
  mockPublishTermination,
  setMockLatency,
} from './publish.mock'
import { getChanges, resetMockChanges } from './mockChangeStore'

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
    resetMockChanges()
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

  describe('early termination', () => {
    it('returns an automatically published termination with the last stop it served', async () => {
      const change = await mockPublishTermination(JOURNEY_ID, { lastStopSequence: 3 })

      expect(change).toMatchObject({
        type: 'termination',
        journeyId: JOURNEY_ID,
        values: { lastStopSequence: 3 },
        publishedBy: 'Dev Network Controller',
        provenance: 'automatically_published',
      })
    })

    it.each([0, -1, 1.5, Number.NaN])('rejects the last stop %p as a validation error', async (lastStopSequence) => {
      const failure = await failureOf(mockPublishTermination(JOURNEY_ID, { lastStopSequence }))

      expect(failure).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
    })

    it('answers a missing journey id with not found', async () => {
      const failure = await failureOf(mockPublishTermination('', { lastStopSequence: 2 }))

      expect(failure).toMatchObject({ status: 404, code: 'NOT_FOUND' })
    })
  })

  describe('the in-memory change store', () => {
    it('records every accepted change on its journey', async () => {
      await mockPublishDelay(JOURNEY_ID, { fromSequence: 2, minutes: 10 })
      await mockPublishTermination(JOURNEY_ID, { lastStopSequence: 4 })

      expect(getChanges(JOURNEY_ID).map((change) => change.type)).toEqual(['delay', 'termination'])
    })

    it('records nothing for a call that fails validation or is forced to fail', async () => {
      await failureOf(mockPublishDelay(JOURNEY_ID, { fromSequence: 2, minutes: 0 }))
      failNextMockCall(new ApiError(500, 'UNKNOWN', 'Boom.'))
      await failureOf(mockPublishCancellation(JOURNEY_ID))

      expect(getChanges(JOURNEY_ID)).toEqual([])
    })

    it('refuses any change to a cancelled journey with a conflict, and records nothing more', async () => {
      await mockPublishCancellation(JOURNEY_ID)

      const failure = await failureOf(mockPublishDelay(JOURNEY_ID, { fromSequence: 2, minutes: 5 }))

      expect(failure).toMatchObject({
        status: 409,
        code: 'CONFLICT',
        message: 'This journey is already cancelled, so it cannot be changed.',
      })
      expect(getChanges(JOURNEY_ID)).toHaveLength(1)
    })

    it('refuses any change to a terminated journey with a conflict', async () => {
      await mockPublishTermination(JOURNEY_ID, { lastStopSequence: 2 })

      const failure = await failureOf(mockPublishPlatformChange(JOURNEY_ID, { sequence: 3, platformId: 'pl-1' }))

      expect(failure).toMatchObject({
        status: 409,
        message: 'This journey has already ended early, so it cannot be changed.',
      })
    })

    it('accepts a termination on a journey that has only a delay so far', async () => {
      await mockPublishDelay(JOURNEY_ID, { fromSequence: 2, minutes: 5 })

      await expect(mockPublishTermination(JOURNEY_ID, { lastStopSequence: 3 })).resolves.toMatchObject({
        type: 'termination',
      })
    })
  })
})
