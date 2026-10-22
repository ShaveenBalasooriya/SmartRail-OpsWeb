import { formatRailwayTime } from '@/shared/lib/railwayTime'
import { DIRECTION_LABELS, type JourneyDetail } from '../types'
import JourneyStatusBadge from './JourneyStatusBadge'
import styles from './JourneyDetailHeader.module.css'

type JourneyDetailHeaderProps = {
  journey: JourneyDetail
}

// The page owns the h1 (the service name), so this component renders the journey's facts with no heading
// of its own. A description list keeps each label bound to its value for screen readers.
export default function JourneyDetailHeader({ journey }: JourneyDetailHeaderProps) {
  return (
    <dl className={styles.details}>
      <div className={styles.item}>
        <dt>Line</dt>
        <dd>
          {journey.lineCode} {journey.lineName}
        </dd>
      </div>
      <div className={styles.item}>
        <dt>Direction</dt>
        <dd>{DIRECTION_LABELS[journey.direction]}</dd>
      </div>
      <div className={styles.item}>
        <dt>Service date</dt>
        <dd>{journey.serviceDate}</dd>
      </div>
      <div className={styles.item}>
        <dt>Scheduled departure</dt>
        <dd>
          <time dateTime={journey.scheduledDepartureAt}>{formatRailwayTime(journey.scheduledDepartureAt)}</time>
        </dd>
      </div>
      <div className={styles.item}>
        <dt>Status</dt>
        <dd>
          <JourneyStatusBadge status={journey.status} />
        </dd>
      </div>
    </dl>
  )
}
