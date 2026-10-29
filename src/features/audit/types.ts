// The audit record is read-only: the API exposes GET routes only, so this feature has no write types.

export type AuditOutcome = 'succeeded' | 'denied'

export type AuditOutcomeFilter = AuditOutcome | 'all'

export const AUDIT_OUTCOME_VALUES: AuditOutcome[] = ['succeeded', 'denied']

export const AUDIT_OUTCOME_LABELS: Record<AuditOutcome, string> = {
  succeeded: 'Succeeded',
  denied: 'Denied',
}

// Untrusted input from a URL or a select element.
export function isAuditOutcomeFilter(value: string): value is AuditOutcomeFilter {
  return value === 'all' || (AUDIT_OUTCOME_VALUES as string[]).includes(value)
}

// A JSON value as the API sends it in before and after. The field is real JSON (an object, an array, a
// scalar or null), never a JSON string, so the detail page can format it directly.
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

// One row of the list. The API omits before, after and the hashes from the list on purpose; they are
// only on the detail so the list stays small.
export type AuditEntryListItem = {
  id: string
  chainPosition: number
  occurredAt: string
  actorStaffId: string | null
  actorRole: string | null
  action: string
  outcome: AuditOutcome
  targetType: string | null
  targetId: string | null
}

export type AuditEntryDetail = AuditEntryListItem & {
  before: JsonValue
  after: JsonValue
  relatedEntryId: string | null
  previousHash: string
  entryHash: string
}

// The paged envelope the API returns for the list.
export type AuditPage<T> = {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

// What the filter form and the URL hold. from and to are railway wall-clock values from a
// datetime-local input (YYYY-MM-DDTHH:mm[:ss]) and are converted to instants only when they are sent.
export type AuditFilterInput = {
  actorId: string
  from: string
  to: string
  outcome: AuditOutcomeFilter
}

// What the API receives. An empty value (or outcome "all") means that filter is not sent.
export type AuditFilters = {
  actorId: string
  from: string
  to: string
  outcome: AuditOutcomeFilter
}

// A discriminated union: an intact result has no failing position, and a broken one always has it.
export type IntegrityResult =
  | { status: 'intact'; entriesChecked: number }
  | { status: 'broken'; firstFailingPosition: number; entriesChecked: number }
