import { useSearchParams } from 'react-router'
import {
  EMPTY_AUDIT_FILTERS,
  auditFilterErrors,
  auditFilterInputFromSearch,
  auditPageFromSearch,
  hasActiveAuditFilters,
  hasAuditFilterErrors,
  toAuditFilters,
} from '../lib/auditFilters'
import type { AuditFilterInput } from '../types'

// Filters are kept in the URL as the wall-clock values the form shows, so a refresh or a shared link
// reproduces the same view. The API is sent instants, converted in one place by toAuditFilters.
//
// The URL is the source of truth for the applied filters. The filter bar holds the values being edited
// and calls apply only after it has validated them; a hand-edited URL is validated here so an invalid
// value is shown instead of being sent.
export function useAuditFilters() {
  const [searchParams, setSearchParams] = useSearchParams()
  const searchKey = searchParams.toString()
  const appliedInput = auditFilterInputFromSearch(new URLSearchParams(searchKey))
  const appliedErrors = auditFilterErrors(appliedInput)
  const isValid = !hasAuditFilterErrors(appliedErrors)
  const filters = isValid ? toAuditFilters(appliedInput) : EMPTY_AUDIT_FILTERS
  const page = auditPageFromSearch(new URLSearchParams(searchKey))

  function apply(input: AuditFilterInput) {
    const normalized = { ...input, actorId: input.actorId.trim() }
    if (hasAuditFilterErrors(auditFilterErrors(normalized))) {
      return
    }

    const next = new URLSearchParams()
    if (normalized.actorId !== '') {
      next.set('actorId', normalized.actorId)
    }
    if (normalized.from !== '') {
      next.set('from', normalized.from)
    }
    if (normalized.to !== '') {
      next.set('to', normalized.to)
    }
    if (normalized.outcome !== 'all') {
      next.set('outcome', normalized.outcome)
    }

    // A new filter set starts at the first page; keeping the old page number would ask for a page that
    // may not exist under the new filters.
    setSearchParams(next, { replace: true })
  }

  function clear() {
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  function setPage(nextPage: number) {
    setSearchParams(
      (previous) => {
        const updated = new URLSearchParams(previous)
        if (nextPage <= 1) {
          updated.delete('page')
        } else {
          updated.set('page', String(nextPage))
        }
        return updated
      },
      { replace: true },
    )
  }

  return {
    appliedInput,
    filters,
    page,
    isValid,
    searchKey,
    hasActiveFilters: hasActiveAuditFilters(filters),
    apply,
    clear,
    setPage,
  }
}
