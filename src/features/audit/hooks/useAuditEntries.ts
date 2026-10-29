import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { AUDIT_PAGE_SIZE, getAuditEntries } from '../api/audit'
import type { AuditFilters } from '../types'

// The filters are part of the key, so each combination caches separately. placeholderData keeps the
// previous page on screen while the next one loads, rather than flashing the loading state on every page.
export function useAuditEntries(filters: AuditFilters, page: number, enabled = true) {
  return useQuery({
    queryKey: ['audit', 'entries', filters, page],
    queryFn: () => getAuditEntries(filters, page, AUDIT_PAGE_SIZE),
    placeholderData: keepPreviousData,
    enabled,
  })
}
