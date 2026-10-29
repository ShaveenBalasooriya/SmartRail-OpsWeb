import Button from '@/shared/components/Button'
import EmptyState from '@/shared/ui/EmptyState'
import FilterBar from '@/shared/ui/FilterBar'
import QueryState from '@/shared/ui/QueryState'
import AuditFilterBar from '../components/AuditFilterBar'
import AuditTable from '../components/AuditTable'
import IntegrityPanel from '../components/IntegrityPanel'
import Pagination from '../components/Pagination'
import { useAuditEntries } from '../hooks/useAuditEntries'
import { useAuditFilters } from '../hooks/useAuditFilters'
import type { AuditEntryListItem, AuditPage as AuditPageResult } from '../types'
import styles from './AuditPage.module.css'

// The Auditor's read-only view (EP-03). There is deliberately no write or delete action: the API exposes
// GET routes only. An empty record ("nothing recorded yet") is distinct from a filtered empty result.
export default function AuditPage() {
  const { appliedInput, filters, page, isValid, searchKey, hasActiveFilters, apply, clear, setPage } =
    useAuditFilters()
  const entries = useAuditEntries(filters, page, isValid)

  // Once a page has loaded, a failed refresh keeps the last page on screen with a note (no blank screens).
  const isStale = entries.isError && entries.data !== undefined

  return (
    <section className={styles.page} aria-labelledby="audit-title">
      <header className={styles.header}>
        <h1 id="audit-title" className={styles.title}>
          Audit
        </h1>
        <p className={styles.subtitle}>Recorded actions, newest first. Read-only.</p>
      </header>

      <IntegrityPanel />

      <FilterBar>
        {/* Remounting on a URL change resets the form to the applied values after Apply, Clear or Back. */}
        <AuditFilterBar
          key={searchKey}
          initialInput={appliedInput}
          onApply={apply}
          onClear={clear}
        />
      </FilterBar>

      {isStale && (
        <p role="alert" className={styles.stale}>
          Could not load this page. The entries below are the previous result.
        </p>
      )}

      {!isValid ? (
        <EmptyState
          title="Filters need attention"
          description="Fix the filter errors above to load the audit record."
        />
      ) : (
        <QueryState<AuditPageResult<AuditEntryListItem>>
          isPending={entries.isPending}
          isError={entries.isError && entries.data === undefined}
          error={entries.error}
          data={entries.data}
          onRetry={entries.refetch}
          // The page distinguishes the two empty cases, so QueryState hands every loaded result through.
          isEmpty={() => false}
          emptyTitle="Nothing has been recorded yet."
        >
          {(result) =>
            result.items.length === 0 ? (
              result.totalCount > 0 ? (
                // A shared or hand-edited page number can land past the end of a non-empty record.
                <EmptyState
                  title="No entries on this page."
                  description="This page is past the end of the result."
                  action={
                    <Button variant="secondary" onClick={() => setPage(1)}>
                      Go to the first page
                    </Button>
                  }
                />
              ) : hasActiveFilters ? (
                <EmptyState
                  title="No entries match these filters."
                  description="Try a wider time range, another actor or all outcomes."
                  action={
                    <Button variant="secondary" onClick={clear}>
                      Clear filters
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  title="Nothing has been recorded yet."
                  description="Entries appear here as staff actions are recorded."
                />
              )
            ) : (
              <>
                <AuditTable entries={result.items} search={searchKey} />
                <Pagination
                  page={result.page}
                  totalPages={result.totalPages}
                  totalCount={result.totalCount}
                  hasPreviousPage={result.hasPreviousPage}
                  hasNextPage={result.hasNextPage}
                  onPrevious={() => setPage(result.page - 1)}
                  onNext={() => setPage(result.page + 1)}
                />
              </>
            )
          }
        </QueryState>
      )}
    </section>
  )
}
