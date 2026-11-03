import { railwayLocalToIso } from '@/shared/lib/railwayTime'
import {
  isAuditOutcomeFilter,
  type AuditFilterInput,
  type AuditFilters,
} from '../types'

export const EMPTY_AUDIT_FILTER_INPUT: AuditFilterInput = {
  actorId: '',
  from: '',
  to: '',
  outcome: 'all',
}

export const EMPTY_AUDIT_FILTERS: AuditFilters = {
  actorId: '',
  from: '',
  to: '',
  outcome: 'all',
}

// A GUID in any case. The API's route and filter both expect one, and a partial value must not reach it.
const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// What a datetime-local input holds: a wall-clock date and time with optional seconds, no offset.
const LOCAL_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/

export type AuditFilterErrors = {
  actorId: string | null
  from: string | null
  to: string | null
  range: string | null
}

export function isGuid(value: string): boolean {
  return GUID_PATTERN.test(value)
}

// The URL is untrusted: a value that is not one of the known filters falls back to "all" rather than
// hiding every row.
export function auditFilterInputFromSearch(params: URLSearchParams): AuditFilterInput {
  const outcome = params.get('outcome')

  return {
    actorId: params.get('actorId') ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    outcome: outcome !== null && isAuditOutcomeFilter(outcome) ? outcome : 'all',
  }
}

// Cross-field validation belongs here so the form, the URL guard and the hook all apply the same rules.
export function auditFilterErrors(input: AuditFilterInput): AuditFilterErrors {
  const actorId = input.actorId.trim()
  const fromValid = input.from === '' || LOCAL_DATE_TIME_PATTERN.test(input.from)
  const toValid = input.to === '' || LOCAL_DATE_TIME_PATTERN.test(input.to)

  return {
    actorId: actorId !== '' && !isGuid(actorId) ? 'Actor id must be a GUID.' : null,
    from: fromValid ? null : 'Enter a valid date and time.',
    to: toValid ? null : 'Enter a valid date and time.',
    // Both values are wall-clock times in the same zone, so their ISO-like text order is their time order.
    range:
      fromValid && toValid && input.from !== '' && input.to !== '' && input.from > input.to
        ? 'The start must not be after the end.'
        : null,
  }
}

export function hasAuditFilterErrors(errors: AuditFilterErrors): boolean {
  return Object.values(errors).some((error) => error !== null)
}

// Converts the form's railway wall-clock values to the instants the API filters on. Called only after
// validation, but a malformed URL value is dropped rather than thrown, so a hand-edited link cannot crash
// the page.
export function toAuditFilters(input: AuditFilterInput): AuditFilters {
  return {
    actorId: input.actorId.trim(),
    from: input.from !== '' && LOCAL_DATE_TIME_PATTERN.test(input.from) ? railwayLocalToIso(input.from) : '',
    to: input.to !== '' && LOCAL_DATE_TIME_PATTERN.test(input.to) ? railwayLocalToIso(input.to) : '',
    outcome: input.outcome,
  }
}

// The two empty states differ: an empty record has no filters, while a filtered empty result is "no match".
export function hasActiveAuditFilters(filters: AuditFilters): boolean {
  return filters.actorId !== '' || filters.from !== '' || filters.to !== '' || filters.outcome !== 'all'
}

// A page number from the URL must be a positive whole number; anything else falls back to the first page.
export function auditPageFromSearch(params: URLSearchParams): number {
  const raw = params.get('page')
  if (raw === null || !/^\d+$/.test(raw)) {
    return 1
  }

  const page = Number.parseInt(raw, 10)
  return page >= 1 ? page : 1
}
