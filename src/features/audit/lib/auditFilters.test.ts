import { describe, expect, it } from 'vitest'
import {
  EMPTY_AUDIT_FILTERS,
  EMPTY_AUDIT_FILTER_INPUT,
  auditFilterErrors,
  auditFilterInputFromSearch,
  auditPageFromSearch,
  hasActiveAuditFilters,
  hasAuditFilterErrors,
  isGuid,
  toAuditFilters,
} from './auditFilters'

const GUID = '0196f2a0-0000-7000-8000-000000000001'

describe('isGuid', () => {
  it.each([GUID, GUID.toUpperCase()])('accepts %s', (value) => {
    expect(isGuid(value)).toBe(true)
  })

  it.each(['', 'not-a-guid', '0196f2a0-0000-7000-8000-00000000000', `${GUID}00`])(
    'rejects %j',
    (value) => {
      expect(isGuid(value)).toBe(false)
    },
  )
})

describe('auditFilterInputFromSearch', () => {
  it('reads every filter from the URL', () => {
    const params = new URLSearchParams({
      actorId: GUID,
      from: '2026-10-28T09:00',
      to: '2026-10-28T17:00',
      outcome: 'denied',
    })

    expect(auditFilterInputFromSearch(params)).toEqual({
      actorId: GUID,
      from: '2026-10-28T09:00',
      to: '2026-10-28T17:00',
      outcome: 'denied',
    })
  })

  it('falls back to an empty filter set and "all" for an unknown outcome', () => {
    expect(auditFilterInputFromSearch(new URLSearchParams('outcome=maybe'))).toEqual(
      EMPTY_AUDIT_FILTER_INPUT,
    )
  })
})

describe('auditFilterErrors', () => {
  it('accepts an empty filter set', () => {
    expect(hasAuditFilterErrors(auditFilterErrors(EMPTY_AUDIT_FILTER_INPUT))).toBe(false)
  })

  it('requires the actor id to be a GUID', () => {
    const errors = auditFilterErrors({ ...EMPTY_AUDIT_FILTER_INPUT, actorId: 'staff-1' })

    expect(errors.actorId).toBe('Actor id must be a GUID.')
    expect(hasAuditFilterErrors(errors)).toBe(true)
  })

  it('ignores surrounding spaces when checking the actor id', () => {
    const errors = auditFilterErrors({ ...EMPTY_AUDIT_FILTER_INPUT, actorId: `  ${GUID}  ` })

    expect(errors.actorId).toBeNull()
  })

  it('accepts a start equal to the end', () => {
    const errors = auditFilterErrors({
      ...EMPTY_AUDIT_FILTER_INPUT,
      from: '2026-10-28T09:00',
      to: '2026-10-28T09:00',
    })

    expect(errors.range).toBeNull()
  })

  it('refuses a start after the end', () => {
    const errors = auditFilterErrors({
      ...EMPTY_AUDIT_FILTER_INPUT,
      from: '2026-10-28T12:00',
      to: '2026-10-28T11:00',
    })

    expect(errors.range).toBe('The start must not be after the end.')
  })

  it('refuses a value that is not a date and time', () => {
    const errors = auditFilterErrors({ ...EMPTY_AUDIT_FILTER_INPUT, from: 'tomorrow' })

    expect(errors.from).toBe('Enter a valid date and time.')
  })
})

describe('toAuditFilters', () => {
  it('converts railway wall-clock values to UTC instants and trims the actor id', () => {
    expect(
      toAuditFilters({
        actorId: `  ${GUID}  `,
        from: '2026-10-28T09:00',
        to: '2026-10-28T17:30',
        outcome: 'succeeded',
      }),
    ).toEqual({
      actorId: GUID,
      from: '2026-10-28T03:30:00.000Z',
      to: '2026-10-28T12:00:00.000Z',
      outcome: 'succeeded',
    })
  })

  it('leaves empty filters empty', () => {
    expect(toAuditFilters(EMPTY_AUDIT_FILTER_INPUT)).toEqual(EMPTY_AUDIT_FILTERS)
  })
})

describe('hasActiveAuditFilters', () => {
  it('is false for the empty set', () => {
    expect(hasActiveAuditFilters(EMPTY_AUDIT_FILTERS)).toBe(false)
  })

  it.each([
    { ...EMPTY_AUDIT_FILTERS, actorId: GUID },
    { ...EMPTY_AUDIT_FILTERS, from: '2026-10-28T03:30:00.000Z' },
    { ...EMPTY_AUDIT_FILTERS, to: '2026-10-28T12:00:00.000Z' },
    { ...EMPTY_AUDIT_FILTERS, outcome: 'denied' as const },
  ])('is true when any filter is set', (filters) => {
    expect(hasActiveAuditFilters(filters)).toBe(true)
  })
})

describe('auditPageFromSearch', () => {
  it.each([
    [null, 1],
    ['2', 2],
    ['0', 1],
    ['-3', 1],
    ['two', 1],
  ])('reads page %j as %i', (raw, expected) => {
    const params = new URLSearchParams(raw === null ? '' : `page=${raw}`)

    expect(auditPageFromSearch(params)).toBe(expected)
  })
})
