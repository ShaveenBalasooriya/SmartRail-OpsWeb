import type { DelayLimits } from '../types'

export type DelayErrors = {
  fromSequence: string | null
  minutes: string | null
}

export type PlatformChangeErrors = {
  sequence: string | null
  platformId: string | null
}

const MINUTES_MESSAGE = (limits: DelayLimits) =>
  `Enter a whole number of minutes from ${limits.minMinutes} to ${limits.maxMinutes}.`

// null means the text is not a whole number. Only digits are accepted, so "1.5", "1e2" and "" all fail.
// The range is checked by the validator, not here, so the caller can tell "not a number" from "too big".
export function parseMinutes(text: string): number | null {
  const trimmed = text.trim()
  if (!/^\d+$/.test(trimmed)) {
    return null
  }
  return Number(trimmed)
}

export function validateDelay({
  fromSequence,
  minutesText,
  limits,
}: {
  fromSequence: number | null
  minutesText: string
  limits: DelayLimits
}): DelayErrors {
  const minutes = parseMinutes(minutesText)
  const isOutOfRange =
    minutes === null || minutes < limits.minMinutes || minutes > limits.maxMinutes

  return {
    fromSequence: fromSequence === null ? 'Choose the stop the delay starts at.' : null,
    minutes: isOutOfRange ? MINUTES_MESSAGE(limits) : null,
  }
}

// currentPlatformId is the stop's platform today. A change to the same platform is refused here, so the
// server's 409 for the same case is only a backstop for a change made by a second controller meanwhile.
export function validatePlatformChange({
  sequence,
  platformId,
  currentPlatformId,
}: {
  sequence: number | null
  platformId: string
  currentPlatformId: string | null
}): PlatformChangeErrors {
  const chosen = platformId.trim()

  let platformError: string | null = null
  if (chosen === '') {
    platformError = 'Choose the new platform.'
  } else if (chosen === currentPlatformId) {
    platformError = 'Choose a platform different from the current one.'
  }

  return {
    sequence: sequence === null ? 'Choose the stop whose platform changes.' : null,
    platformId: platformError,
  }
}

export type TerminationErrors = {
  lastStopSequence: string | null
}

// The server accepts only a calling stop that is not the final one. The form offers only those stops, so the
// only error here is a missing choice. The calling and final-stop rules are not repeated, to keep one source.
export function validateTermination({ lastStopSequence }: { lastStopSequence: number | null }): TerminationErrors {
  return {
    lastStopSequence: lastStopSequence === null ? 'Choose the last stop the train served.' : null,
  }
}
