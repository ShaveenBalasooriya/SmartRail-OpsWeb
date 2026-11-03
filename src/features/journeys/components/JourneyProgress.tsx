import { formatRailwayTime } from '@/shared/lib/railwayTime'
import type { JourneyProgress as JourneyProgressData } from '../lib/journeyStops'
import styles from './JourneyProgress.module.css'

type JourneyProgressProps = {
  progress: JourneyProgressData
}

// The bar is numeric for screen readers through the progressbar role, and the sentence spells the same
// facts out in words. A terminated journey has no next stop, so only the departure half is said. The
// sentence is the only place the page says where the train is: the API reports no further position.
export default function JourneyProgress({ progress }: JourneyProgressProps) {
  const { departedCount, callingCount, lastDeparted, nextStop } = progress
  const percent = callingCount === 0 ? 0 : (departedCount / callingCount) * 100

  return (
    <section aria-labelledby="progress-title" className={styles.section}>
      <h2 id="progress-title" className={styles.title}>
        Progress
      </h2>

      <div className={styles.card}>
        <div
          className={styles.bar}
          role="progressbar"
          aria-label="Stops departed"
          aria-valuemin={0}
          aria-valuemax={callingCount}
          aria-valuenow={departedCount}
          aria-valuetext={`${departedCount} of ${callingCount} stops departed`}
        >
          <div className={styles.fill} style={{ width: `${percent}%` }} />
        </div>

        <p>
          <strong>
            {departedCount} of {callingCount} stops departed.
          </strong>
          {lastDeparted !== null && (
            <>
              {' '}
              Last departed {lastDeparted.stationName ?? 'Unknown station'} at{' '}
              <time dateTime={lastDeparted.at}>{formatRailwayTime(lastDeparted.at)}</time>.
            </>
          )}
          {nextStop !== null && (
            <>
              {' '}
              Next stop {nextStop.stationName ?? 'Unknown station'}
              {nextStop.expected !== null && (
                <>
                  , expected{' '}
                  <time dateTime={nextStop.expected}>{formatRailwayTime(nextStop.expected)}</time>
                </>
              )}
              .
            </>
          )}
        </p>

        <p className={styles.muted}>Progress is derived from the guard's departure logs.</p>
      </div>
    </section>
  )
}
