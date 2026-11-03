import { Link } from 'react-router'
import DelayPill from '@/features/journeys/components/DelayPill'
import JourneyStatusBadge from '@/features/journeys/components/JourneyStatusBadge'
import type { MapTrain } from '../lib/placeTrains'
import styles from './MapTrainTable.module.css'

type MapTrainTableProps = {
  trains: readonly MapTrain[]
}

// The map's text equivalent: the same trains, in the same order, with their position written out. It
// reuses the board's status badge and delay pill so a status reads the same on both screens.
export default function MapTrainTable({ trains }: MapTrainTableProps) {
  return (
    <section className={styles.section} aria-labelledby="map-trains-title">
      <h2 id="map-trains-title" className={styles.title}>
        Trains on the map
      </h2>
      <div className={styles.wrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Service</th>
              <th scope="col">Status</th>
              <th scope="col">Position</th>
              <th scope="col">Early or late</th>
            </tr>
          </thead>
          <tbody>
            {trains.map((train) => (
              <tr key={train.journey.id}>
                <td>
                  <Link to={`/journeys/${encodeURIComponent(train.journey.id)}`}>
                    {train.serviceName}
                  </Link>
                </td>
                <td>
                  <JourneyStatusBadge status={train.journey.status} />
                </td>
                <td>
                  {train.positionText}
                  {train.journey.isStale && (
                    <>
                      {' '}
                      <span className={styles.stale}>Stale</span>
                    </>
                  )}
                </td>
                <td>
                  <DelayPill delayMinutes={train.journey.delayMinutes} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
