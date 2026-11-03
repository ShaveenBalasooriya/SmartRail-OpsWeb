import { Link } from 'react-router'
import Badge from '@/shared/components/Badge'
import { formatRailwayDateTime } from '@/shared/lib/railwayTime'
import { AUDIT_OUTCOME_LABELS, type AuditEntryListItem } from '../types'
import styles from './AuditTable.module.css'

type AuditTableProps = {
  entries: AuditEntryListItem[]
  // The list's URL search, carried to the detail so its Back link returns to the same filters and page.
  search: string
}

// A native table: the API pages server-side, so the list never grows large enough to need virtualization.
export default function AuditTable({ entries, search }: AuditTableProps) {
  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <caption className="sr-only">Audit entries</caption>
        <thead>
          <tr>
            <th scope="col">Position</th>
            <th scope="col">Time</th>
            <th scope="col">Actor</th>
            <th scope="col">Action</th>
            <th scope="col">Outcome</th>
            <th scope="col">Target</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td>{entry.chainPosition}</td>
              <td>
                <time dateTime={entry.occurredAt}>{formatRailwayDateTime(entry.occurredAt)}</time>
              </td>
              <td>
                <ActorCell entry={entry} />
              </td>
              <td>
                <Link className={styles.action} to={detailHref(entry.id, search)}>
                  {entry.action}
                </Link>
              </td>
              <td>
                {/* The label is text, so the outcome is never colour alone (WCAG 1.4.1). */}
                <Badge kind="status" value={entry.outcome} size="sm">
                  {AUDIT_OUTCOME_LABELS[entry.outcome]}
                </Badge>
              </td>
              <td>
                <TargetCell entry={entry} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function detailHref(id: string, search: string): string {
  const path = `/audit/${encodeURIComponent(id)}`
  return search === '' ? path : `${path}?${search}`
}

// There is no staff-name lookup for the Auditor, so the role is the readable part and the id is shortened
// with the full value in the tooltip (and on the detail page).
function ActorCell({ entry }: { entry: AuditEntryListItem }) {
  if (entry.actorStaffId === null) {
    return <>{entry.actorRole ?? '—'}</>
  }

  return (
    <>
      {entry.actorRole ?? 'Unknown role'}{' '}
      <span className={styles.id} title={entry.actorStaffId}>
        {shortId(entry.actorStaffId)}
      </span>
    </>
  )
}

function TargetCell({ entry }: { entry: AuditEntryListItem }) {
  if (entry.targetType === null && entry.targetId === null) {
    return <>—</>
  }

  return (
    <>
      {entry.targetType ?? 'Unknown target'}
      {entry.targetId !== null && (
        <>
          {' '}
          <span className={styles.id} title={entry.targetId}>
            {shortId(entry.targetId)}
          </span>
        </>
      )}
    </>
  )
}

function shortId(value: string): string {
  return value.slice(0, 8)
}
