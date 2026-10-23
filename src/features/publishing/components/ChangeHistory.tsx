import { formatRailwayTime } from '@/shared/lib/railwayTime'
import type { ChangeView } from '../lib/changeHistory'
import styles from './ChangeHistory.module.css'

type ChangeHistoryProps = {
  // Already newest first; see toChangeViews.
  changes: ChangeView[]
}

// Each change's type, values, publisher, time and provenance are text, so none of them depends on colour.
// The publish time is railway time with its machine value, as the rest of the app shows times.
export default function ChangeHistory({ changes }: ChangeHistoryProps) {
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
            <li key={change.id} className={styles.item}>
              <p className={styles.heading}>
                <span className={styles.type}>{change.typeLabel}</span>
                {change.isCorrected && <span className={styles.corrected}>Corrected</span>}
              </p>
              <p className={styles.summary}>{change.summary}</p>
              <p className={styles.meta}>
                Published by {change.publisher} at{' '}
                <time dateTime={change.publishedAt}>{formatRailwayTime(change.publishedAt)}</time>
                <span className={styles.provenance}>{change.provenanceLabel}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
