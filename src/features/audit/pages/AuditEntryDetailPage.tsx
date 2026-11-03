import type { ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import Badge from '@/shared/components/Badge'
import { formatRailwayDateTime } from '@/shared/lib/railwayTime'
import QueryState from '@/shared/ui/QueryState'
import { useAuditEntry } from '../hooks/useAuditEntry'
import { AUDIT_OUTCOME_LABELS, type AuditEntryDetail, type JsonValue } from '../types'
import styles from './AuditEntryDetailPage.module.css'

// One entry, with the values that are too large for the list (before, after and the two hashes). The
// list's filters and page travel in this page's search, so Back returns to the same view.
export default function AuditEntryDetailPage() {
  const { entryId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const search = searchParams.toString()
  const backHref = `/audit${search === '' ? '' : `?${search}`}`
  const entry = useAuditEntry(entryId)

  return (
    <section className={styles.page} aria-labelledby="audit-entry-title">
      <Link to={backHref} className={styles.back}>
        Back to audit
      </Link>

      <header>
        <h1 id="audit-entry-title" className={styles.title}>
          Audit entry
        </h1>
      </header>

      <QueryState<AuditEntryDetail>
        isPending={entry.isPending}
        isError={entry.isError && entry.data === undefined}
        error={entry.error}
        data={entry.data}
        onRetry={entry.refetch}
        isEmpty={() => false}
        emptyTitle="Audit entry not found"
        notFoundTitle="Audit entry not found"
      >
        {(detail) => (
          <>
            <dl className={styles.details}>
              <Fact label="Entry id">
                <code className={styles.mono}>{detail.id}</code>
              </Fact>
              <Fact label="Position">{detail.chainPosition}</Fact>
              <Fact label="Recorded at">
                <time dateTime={detail.occurredAt}>{formatRailwayDateTime(detail.occurredAt)}</time>
              </Fact>
              <Fact label="Actor role">{detail.actorRole ?? '—'}</Fact>
              <Fact label="Actor staff id">
                {detail.actorStaffId === null ? (
                  '—'
                ) : (
                  <code className={styles.mono}>{detail.actorStaffId}</code>
                )}
              </Fact>
              <Fact label="Action">{detail.action}</Fact>
              <Fact label="Outcome">
                <Badge kind="status" value={detail.outcome} size="sm">
                  {AUDIT_OUTCOME_LABELS[detail.outcome]}
                </Badge>
              </Fact>
              <Fact label="Target type">{detail.targetType ?? '—'}</Fact>
              <Fact label="Target id">
                {detail.targetId === null ? '—' : <code className={styles.mono}>{detail.targetId}</code>}
              </Fact>
              <Fact label="Related entry">
                {detail.relatedEntryId === null ? (
                  '—'
                ) : (
                  <Link to={relatedHref(detail.relatedEntryId, search)}>
                    <code className={styles.mono}>{detail.relatedEntryId}</code>
                  </Link>
                )}
              </Fact>
              <Fact label="Previous hash">
                <code className={styles.mono}>{detail.previousHash}</code>
              </Fact>
              <Fact label="Entry hash">
                <code className={styles.mono}>{detail.entryHash}</code>
              </Fact>
            </dl>

            <div className={styles.changeGrid}>
              <JsonSection title="Before" value={detail.before} />
              <JsonSection title="After" value={detail.after} />
            </div>
          </>
        )}
      </QueryState>
    </section>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.item}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function JsonSection({ title, value }: { title: string; value: JsonValue }) {
  const id = `audit-${title.toLowerCase()}-title`

  return (
    <section className={styles.jsonSection} aria-labelledby={id}>
      <h2 id={id} className={styles.sectionTitle}>
        {title}
      </h2>
      <pre className={styles.json}>{formatJson(value)}</pre>
    </section>
  )
}

function relatedHref(id: string, search: string): string {
  const path = `/audit/${encodeURIComponent(id)}`
  return search === '' ? path : `${path}?${search}`
}

// The API sends real JSON, not a string, so it is formatted rather than shown escaped.
function formatJson(value: JsonValue): string {
  return JSON.stringify(value, null, 2) ?? 'null'
}
