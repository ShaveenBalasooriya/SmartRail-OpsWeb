import { formatRailwayTime } from '@/shared/lib/railwayTime'
import { firstScheduledDeparture } from '../lib/journeyStops'
import { DIRECTION_LABELS, lineLabel, type JourneyDetail } from '../types'
import DelayPill from './DelayPill'
import JourneyStatusBadge from './JourneyStatusBadge'
import styles from './JourneyDetailHeader.module.css'

type JourneyDetailHeaderProps = {
  journey: JourneyDetail
}

// The page owns the h1 (the service name), so this component renders the journey's facts with no heading
// of its own. A description list keeps each label bound to its value for screen readers. The design shows
// no service-date row because the operations feed does not report one; the scheduled departure is derived
// from the first calling stop, which is the only place the API carries it.
export default function JourneyDetailHeader({ journey }: JourneyDetailHeaderProps) {
  const scheduledDeparture = firstScheduledDeparture(journey.stops)

  return (
    <dl className={styles.details}>
      <div className={styles.item}>
        <dt>Line</dt>
        <dd>{lineLabel(journey)}</dd>
      </div>
      <div className={styles.item}>
        <dt>Direction</dt>
        <dd>{journey.direction === null ? '—' : DIRECTION_LABELS[journey.direction]}</dd>
      </div>
      <div className={styles.item}>
        <dt>Scheduled departure</dt>
        <dd>
          {scheduledDeparture === null ? (
            '—'
          ) : (
            <time dateTime={scheduledDeparture}>{formatRailwayTime(scheduledDeparture)}</time>
          )}
        </dd>
      </div>
      <div className={styles.item}>
        <dt>Status</dt>
        <dd>
          <JourneyStatusBadge status={journey.status} />
        </dd>
      </div>
      <div className={styles.item}>
        <dt>Early or late</dt>
        <dd>
          <DelayPill delayMinutes={journey.delayMinutes} />
        </dd>
      </div>
      <div className={styles.item}>
        <dt>Guard</dt>
        <dd>{journey.guardName ?? '—'}</dd>
      </div>
    </dl>
  )
}
