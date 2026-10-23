import { describe, expect, it } from 'vitest'
import { parseMinutes, validateDelay, validatePlatformChange, validateTermination } from './validateChange'

const MINUTES_MESSAGE = 'Enter a whole number of minutes from 1 to 720.'

describe('parseMinutes', () => {
  it.each([
    ['1', 1],
    ['720', 720],
    [' 15 ', 15],
    ['0', 0],
    ['721', 721],
  ])('reads the whole number %j as %i', (text, expected) => {
    expect(parseMinutes(text)).toBe(expected)
  })

  it.each(['', '   ', '1.5', '1e2', '-3', '+4', 'ten', '12 minutes'])('returns null for %j', (text) => {
    expect(parseMinutes(text)).toBeNull()
  })
})

describe('validateDelay', () => {
  it('accepts a chosen stop and minutes at the bounds 1 and 720', () => {
    expect(validateDelay({ fromSequence: 2, minutesText: '1' })).toEqual({ fromSequence: null, minutes: null })
    expect(validateDelay({ fromSequence: 2, minutesText: '720' })).toEqual({
      fromSequence: null,
      minutes: null,
    })
  })

  it.each(['0', '721', '1.5', '', '   ', 'abc'])('rejects the minutes %j with the spec message', (minutesText) => {
    expect(validateDelay({ fromSequence: 2, minutesText }).minutes).toBe(MINUTES_MESSAGE)
  })

  it('requires a stop', () => {
    expect(validateDelay({ fromSequence: null, minutesText: '5' }).fromSequence).toBe(
      'Choose the stop the delay starts at.',
    )
  })

  it('reports both fields together when both are wrong', () => {
    expect(validateDelay({ fromSequence: null, minutesText: '0' })).toEqual({
      fromSequence: 'Choose the stop the delay starts at.',
      minutes: MINUTES_MESSAGE,
    })
  })
})

describe('validatePlatformChange', () => {
  it('accepts a stop and a different platform', () => {
    expect(
      validatePlatformChange({ sequence: 2, platformId: 'pl-3', currentPlatformId: 'pl-2' }),
    ).toEqual({ sequence: null, platformId: null })
  })

  it('requires a stop', () => {
    expect(validatePlatformChange({ sequence: null, platformId: 'pl-3', currentPlatformId: null }).sequence).toBe(
      'Choose the stop whose platform changes.',
    )
  })

  it('requires a platform, and treats a blank id as none', () => {
    expect(validatePlatformChange({ sequence: 2, platformId: '', currentPlatformId: 'pl-2' }).platformId).toBe(
      'Choose the new platform.',
    )
    expect(validatePlatformChange({ sequence: 2, platformId: '   ', currentPlatformId: 'pl-2' }).platformId).toBe(
      'Choose the new platform.',
    )
  })

  it('refuses the platform the stop already has', () => {
    expect(validatePlatformChange({ sequence: 2, platformId: 'pl-2', currentPlatformId: 'pl-2' }).platformId).toBe(
      'Choose a platform different from the current one.',
    )
  })

  it('accepts any platform when the stop has none today', () => {
    expect(validatePlatformChange({ sequence: 2, platformId: 'pl-2', currentPlatformId: null }).platformId).toBeNull()
  })
})

describe('validateTermination', () => {
  it('accepts a chosen last stop', () => {
    expect(validateTermination({ lastStopSequence: 3 })).toEqual({ lastStopSequence: null })
  })

  it('requires a last stop with the spec message', () => {
    expect(validateTermination({ lastStopSequence: null })).toEqual({
      lastStopSequence: 'Choose the last stop the train served.',
    })
  })
})
