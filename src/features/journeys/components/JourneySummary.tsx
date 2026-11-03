import JourneyStatusBadge from './JourneyStatusBadge'
import type { JourneySummaryCounts } from '../lib/summariseJourneys'
import styles from './JourneySummary.module.css'

type JourneySummaryProps = {
  counts: JourneySummaryCounts
}

// The four tiles above the filters. Each tile pairs a colour with a word (a badge, a pill or the word
// Stale), so the count is never colour alone. The counts come from the loaded rows only; the page hides
// the list while there are none rather than showing a row of meaningless zeros.
export default function JourneySummary({ counts }: JourneySummaryProps) {
  return (
    <ul className={styles.summary} aria-label="Summary">
      <li className={styles.tile}>
        <span className={styles.label}>
          <JourneyStatusBadge status="running" />
        </span>
        <span className={styles.number}>{counts.running}</span>
        <span className={styles.hint}>journeys on the network now</span>
      </li>

      <li className={styles.tile}>
        <span className={styles.label}>
          <span className={styles.late}>Late</span>
        </span>
        <span className={styles.number}>{counts.late}</span>
        <span className={styles.hint}>running behind schedule</span>
      </li>

      <li className={styles.tile}>
        <span className={styles.label}>
          <JourneyStatusBadge status="cancelled" />
        </span>
        <span className={styles.number}>{counts.cancelled}</span>
        <span className={styles.hint}>no service on this date</span>
      </li>

      <li className={styles.tile}>
        <span className={styles.label}>
          <span className={styles.stale}>Stale</span>
        </span>
        <span className={styles.number}>{counts.stale}</span>
        <span className={styles.hint}>no recent update</span>
      </li>
    </ul>
  )
}
