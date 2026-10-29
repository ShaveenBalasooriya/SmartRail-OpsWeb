import { api } from '@/shared/api/client'
import type {
  AuditEntryDetail,
  AuditEntryListItem,
  AuditFilters,
  AuditOutcome,
  AuditPage,
  IntegrityResult,
  JsonValue,
} from '../types'

// Wire shapes of the SmartRail-API audit contracts (SmartRail.Audit.Contracts), kept local to this file
// and mapped to the app types below. The list deliberately carries no before/after values or hashes.
//
// The OpenAPI declares the numeric fields as integer or string (the host allows numbers to be read from
// strings), so they are parsed in one place rather than trusted to be numbers.
type AuditEntryListItemWire = {
  id: string
  chainPosition: number | string
  occurredAt: string
  actorStaffId: string | null
  actorRole: string | null
  action: string
  outcome: AuditOutcome
  targetType: string | null
  targetId: string | null
}

type AuditEntryDetailWire = AuditEntryListItemWire & {
  before: JsonValue
  after: JsonValue
  relatedEntryId: string | null
  previousHash: string
  entryHash: string
}

type AuditPageWire<T> = {
  items: T[]
  page: number | string
  pageSize: number | string
  totalCount: number | string
  totalPages: number | string
  hasNextPage: boolean
  hasPreviousPage: boolean
}

// firstFailingPosition is absent (or null) on an intact report and present on a broken one. Typing all
// three shapes is honest about the wire; the mapping below refuses a broken report without a position.
type IntegrityResultWire = {
  status: 'intact' | 'broken'
  firstFailingPosition?: number | string | null
  entriesChecked: number | string
}

// The API's own default. Kept here so the page and the hook agree on a page size without repeating 25.
export const AUDIT_PAGE_SIZE = 25

export async function getAuditEntries(
  filters: AuditFilters,
  page: number,
  pageSize: number = AUDIT_PAGE_SIZE,
): Promise<AuditPage<AuditEntryListItem>> {
  const query = new URLSearchParams()

  // An empty filter is omitted rather than sent as an empty string, which the API would reject.
  if (filters.actorId !== '') {
    query.set('actorId', filters.actorId)
  }
  if (filters.from !== '') {
    query.set('from', filters.from)
  }
  if (filters.to !== '') {
    query.set('to', filters.to)
  }
  if (filters.outcome !== 'all') {
    query.set('outcome', filters.outcome)
  }
  query.set('page', String(page))
  query.set('pageSize', String(pageSize))

  const body = await api.get<AuditPageWire<AuditEntryListItemWire>>(
    `/api/v1/audit/entries?${query.toString()}`,
  )

  return {
    items: body.items.map(toAuditEntryListItem),
    page: toWholeNumber(body.page),
    pageSize: toWholeNumber(body.pageSize),
    totalCount: toWholeNumber(body.totalCount),
    totalPages: toWholeNumber(body.totalPages),
    hasNextPage: body.hasNextPage,
    hasPreviousPage: body.hasPreviousPage,
  }
}

export async function getAuditEntry(id: string): Promise<AuditEntryDetail> {
  const entry = await api.get<AuditEntryDetailWire>(
    `/api/v1/audit/entries/${encodeURIComponent(id)}`,
  )

  return {
    ...toAuditEntryListItem(entry),
    before: entry.before,
    after: entry.after,
    relatedEntryId: entry.relatedEntryId,
    previousHash: entry.previousHash,
    entryHash: entry.entryHash,
  }
}

// A GET that is an action: the auditor asks the API to verify the whole chain, so it is never cached as
// a read the way a list is.
export async function checkIntegrity(): Promise<IntegrityResult> {
  const result = await api.get<IntegrityResultWire>('/api/v1/audit/integrity')

  if (result.status === 'intact') {
    return { status: 'intact', entriesChecked: toWholeNumber(result.entriesChecked) }
  }

  if (result.firstFailingPosition !== undefined && result.firstFailingPosition !== null) {
    return {
      status: 'broken',
      firstFailingPosition: toWholeNumber(result.firstFailingPosition),
      entriesChecked: toWholeNumber(result.entriesChecked),
    }
  }

  throw new Error('The audit integrity check reported a broken chain without a failing position.')
}

function toAuditEntryListItem(entry: AuditEntryListItemWire): AuditEntryListItem {
  return {
    id: entry.id,
    chainPosition: toWholeNumber(entry.chainPosition),
    occurredAt: entry.occurredAt,
    actorStaffId: entry.actorStaffId,
    actorRole: entry.actorRole,
    action: entry.action,
    outcome: entry.outcome,
    targetType: entry.targetType,
    targetId: entry.targetId,
  }
}

// A value that is not a whole number cannot be ordered or paged, so it fails loudly rather than showing
// a wrong position. The API's own JSON is a number; the string form is allowed by the host's number
// handling and would otherwise break arithmetic in the pager.
function toWholeNumber(value: number | string): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10)
  if (!Number.isInteger(parsed)) {
    throw new Error('The audit record sent a value that is not a whole number.')
  }
  return parsed
}
