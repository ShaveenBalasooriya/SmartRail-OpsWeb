import { Link } from 'react-router'
import { formatRailwayTime } from '@/shared/lib/railwayTime'
import type { ChangeView } from '../lib/changeHistory'
import styles from './ChangeHistory.module.css'

type ChangeHistoryProps = {
  // Already newest first; see toChangeViews.
  changes: ChangeView[]
  // Given only for a controller, and only when the correction drawer is reachable. Without it the history
  // stays read-only, as it does for an auditor. It returns the drawer's URL for a change, so the action is a
  // real link: the drawer can be opened in a new tab and the change id travels in the query string.
  correctionHref?: (change: ChangeView) => string
}

// Each change's type, values, publisher, time and provenance are text, so none of them depends on colour.
// The publish time is railway time with its machine value, as the rest of the app shows times. A correction
// and the change it reverts link to each other with their own type and publish time, so the pair reads as
// one exchange. The correction action is offered only on a change the server would still accept one for.
export default function ChangeHistory({ changes, correctionHref }: ChangeHistoryProps) {
  return (
    <section aria-labelledby="change-history-title" className={styles.section}>
      <h2 id="change-history-title" className={styles.title}>
        Change history
      </h2>

      {changes.length === 0 ? (
        <p className={styles.empty}>No changes published</p>
      ) : (
        <ul className={styles.list}>
          {changes.map((change) => (
            <li key={change.id} id={`change-${change.id}`} className={styles.item}>
              <p className={styles.heading}>
                <span className={styles.type}>{change.typeLabel}</span>
                {change.isCorrected && <span className={styles.corrected}>Corrected</span>}
              </p>
              <p className={styles.summary}>{change.summary}</p>
              <p className={styles.meta}>
                <span className={styles.provenance}>{change.provenanceLabel}</span>
                <span>{change.publisher}</span>
                <span aria-hidden="true">·</span>
                <time dateTime={change.publishedAt}>{formatRailwayTime(change.publishedAt)}</time>
              </p>
              {change.original !== null && (
                <a className={styles.correctionLink} href={`#change-${change.original.id}`}>
                  Original: {change.original.label}
                </a>
              )}
              {change.correctedBy !== null && (
                <a className={styles.correctionLink} href={`#change-${change.correctedBy.id}`}>
                  Corrected by: {change.correctedBy.label}
                </a>
              )}
              {correctionHref !== undefined && change.isCorrectable && (
                <Link className={styles.action} to={correctionHref(change)}>
                  Correct this change
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
