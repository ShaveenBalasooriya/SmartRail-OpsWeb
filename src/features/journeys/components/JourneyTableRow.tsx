import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { formatRailwayTime } from '@/shared/lib/railwayTime'
import { DIRECTION_LABELS, lineLabel, type Journey } from '../types'
import DelayPill from './DelayPill'
import JourneyStatusBadge from './JourneyStatusBadge'
import styles from './JourneyTable.module.css'

type JourneyTableRowProps = {
  journey: Journey
}

// A pure row: it receives a journey and renders it. The line and guard sit under the service name as
// secondary lines, so no column is invented for data the design kept secondary. A journey that has not
// departed says so in words, while a missing next station is a visible dash. `isStale` is the API's own
// flag: it adds the highlight style and the word Stale next to the update time.
export default function JourneyTableRow({ journey }: JourneyTableRowProps) {
  const detailPath = `/journeys/${encodeURIComponent(journey.id)}`
  const serviceName = journey.serviceName ?? 'Unnamed service'

  return (
    <tr className={journey.isStale ? styles.rowStale : undefined}>
      <td>
        <div className={styles.service}>{serviceName}</div>
        <div className={styles.muted}>{lineLabel(journey)}</div>
        {journey.guardName !== null && <div className={styles.muted}>Guard: {journey.guardName}</div>}
      </td>
      <td>{journey.direction === null ? '—' : DIRECTION_LABELS[journey.direction]}</td>
      <td>
        <JourneyStatusBadge status={journey.status} />
      </td>
      <td>
        <div>{journey.lastDepartedStation?.name ?? 'Not yet departed'}</div>
        <div className={styles.muted}>Next: {journey.nextStation?.name ?? '—'}</div>
      </td>
      <td>
        <DelayPill delayMinutes={journey.delayMinutes} />
      </td>
      <td>
        <div className={styles.updated}>
          <time dateTime={journey.lastUpdatedAt}>{formatRailwayTime(journey.lastUpdatedAt, true)}</time>
          {journey.isStale && <span className={styles.stale}>Stale</span>}
        </div>
      </td>
      <td className={styles.viewCell}>
        <Link to={detailPath} className={styles.viewButton} aria-label={`View ${serviceName}`} title="View journey">
          <ArrowRight aria-hidden="true" size={18} />
        </Link>
      </td>
    </tr>
  )
}
