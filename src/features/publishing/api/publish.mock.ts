import { appliedStatus } from '@/features/journeys/lib/applyChanges'
import { ApiError } from '@/shared/api/ApiError'
import {
  DELAY_MAX_MINUTES,
  DELAY_MIN_MINUTES,
  type ChangeType,
  type DelayInput,
  type PlatformChangeInput,
  type PublishedChange,
  type TerminationInput,
} from '../types'
import { getChanges, recordChange } from './mockChangeStore'

// The mock stands in for the real endpoints until add-controller-operations ships. It applies the rules the
// spec states, so a form that the mock accepts is one the API should accept too. Each accepted change is kept
// in the in-memory change store, so the journey shows it. The store empties on a page reload.
const MOCK_PUBLISHER = 'Dev Network Controller'
const DEFAULT_LATENCY_MS = 300

let latencyMs = DEFAULT_LATENCY_MS
let nextFailure: ApiError | null = null

// Tests use zero so they do not wait on the simulated network.
export function setMockLatency(ms: number): void {
  latencyMs = ms
}

// Tests only. The next mock call rejects with this error, then the mock returns to normal.
export function failNextMockCall(error: ApiError): void {
  nextFailure = error
}

export async function mockPublishDelay(journeyId: string, input: DelayInput): Promise<PublishedChange> {
  return respond(() => {
    requireJourney(journeyId)
    requireOpen(journeyId)
    requireStop(input.fromSequence)
    if (
      !Number.isInteger(input.minutes) ||
      input.minutes < DELAY_MIN_MINUTES ||
      input.minutes > DELAY_MAX_MINUTES
    ) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        `Minutes must be a whole number from ${DELAY_MIN_MINUTES} to ${DELAY_MAX_MINUTES}.`,
      )
    }
    return publishedChange('delay', journeyId, { fromSequence: input.fromSequence, minutes: input.minutes })
  })
}

export async function mockPublishCancellation(journeyId: string): Promise<PublishedChange> {
  return respond(() => {
    requireJourney(journeyId)
    requireOpen(journeyId)
    return publishedChange('cancellation', journeyId, {})
  })
}

export async function mockPublishPlatformChange(
  journeyId: string,
  input: PlatformChangeInput,
): Promise<PublishedChange> {
  return respond(() => {
    requireJourney(journeyId)
    requireOpen(journeyId)
    requireStop(input.sequence)
    if (input.platformId.trim() === '') {
      throw new ApiError(400, 'VALIDATION_ERROR', 'A platform is required.')
    }
    return publishedChange('platform_change', journeyId, {
      sequence: input.sequence,
      platformId: input.platformId,
    })
  })
}

// The mock has no timetable, so it cannot tell a calling stop from a passing one, nor the final calling stop
// from an earlier one. It checks the shape only. The form offers only the stops the rule allows, and the real
// API enforces the rule itself.
export async function mockPublishTermination(journeyId: string, input: TerminationInput): Promise<PublishedChange> {
  return respond(() => {
    requireJourney(journeyId)
    requireOpen(journeyId)
    requireStop(input.lastStopSequence)
    return publishedChange('termination', journeyId, { lastStopSequence: input.lastStopSequence })
  })
}

// The failure is taken before validation, so a forced failure happens even for a valid request. The
// latency applies to every call, so the pending state is visible in the app.
async function respond<T>(run: () => T): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, latencyMs))

  if (nextFailure !== null) {
    const failure = nextFailure
    nextFailure = null
    throw failure
  }

  return run()
}

function requireJourney(journeyId: string): void {
  if (journeyId.trim() === '') {
    throw new ApiError(404, 'NOT_FOUND', 'This journey could not be found.')
  }
}

// The real API refuses a change to a cancelled or terminated journey with 409, and so does the mock. The mock
// knows a journey's status only from its own changes, so it cannot tell a scheduled journey from a running one.
function requireOpen(journeyId: string): void {
  const status = appliedStatus(null, getChanges(journeyId))
  if (status === 'cancelled') {
    throw new ApiError(409, 'CONFLICT', 'This journey is already cancelled, so it cannot be changed.')
  }
  if (status === 'terminated') {
    throw new ApiError(409, 'CONFLICT', 'This journey has already ended early, so it cannot be changed.')
  }
}

// The mock has no timetable, so it cannot tell a calling stop from a passing one. It only checks the shape.
function requireStop(sequence: number): void {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Choose a valid stop.')
  }
}

// The change is recorded only here, after validation, so a rejected request leaves no trace in the journey.
function publishedChange(
  type: ChangeType,
  journeyId: string,
  values: PublishedChange['values'],
): PublishedChange {
  const change: PublishedChange = {
    id: crypto.randomUUID(),
    type,
    journeyId,
    values,
    publishedBy: MOCK_PUBLISHER,
    publishedAt: new Date().toISOString(),
    provenance: 'automatically_published',
    correctedByChangeId: null,
    correctsChangeId: null,
  }
  recordChange(change)
  return change
}
