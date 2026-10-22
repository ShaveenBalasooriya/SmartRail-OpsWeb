import { DELAY_MAX_MINUTES, DELAY_MIN_MINUTES } from '../types'

export type DelayErrors = {
  fromSequence: string | null
  minutes: string | null
}

export type PlatformChangeErrors = {
  sequence: string | null
  platformId: string | null
}

const MINUTES_MESSAGE = `Enter a whole number of minutes from ${DELAY_MIN_MINUTES} to ${DELAY_MAX_MINUTES}.`

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
}: {
  fromSequence: number | null
  minutesText: string
}): DelayErrors {
  const minutes = parseMinutes(minutesText)
  const isOutOfRange = minutes === null || minutes < DELAY_MIN_MINUTES || minutes > DELAY_MAX_MINUTES

  return {
    fromSequence: fromSequence === null ? 'Choose the stop the delay starts at.' : null,
    minutes: isOutOfRange ? MINUTES_MESSAGE : null,
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
