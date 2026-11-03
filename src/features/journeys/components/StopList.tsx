import StationName from '@/features/stations/components/StationName'
import { formatRailwayTime } from '@/shared/lib/railwayTime'
import type { StopRow, StopState } from '../lib/journeyStops'
import styles from './StopList.module.css'

type StopListProps = {
  rows: StopRow[]
  // The ids the network marks as interchanges, from /network/stations. Absent while that query loads or
  // after it fails, in which case the list still renders and simply carries no tag.
  interchangeStationIds?: ReadonlySet<string>
}

const STATE_LABELS: Record<StopState, string> = {
  departed: 'Departed',
  next: 'Next stop',
  upcoming: 'Upcoming',
  notServed: 'Not served',
  notCalling: 'Does not stop',
}

const DOT_CLASS: Record<StopState, string | null> = {
  departed: styles.dotDeparted,
  next: styles.dotNext,
  upcoming: null,
  notServed: styles.dotNotServed,
  notCalling: null,
}

// A dash is printed rather than an empty cell, so a missing value is visible and not mistaken for a blank
// row. The origin stop has no arrival, so the dash is the normal case there, not an error.
function renderTime(value: string | null) {
  if (value === null) {
    return '—'
  }

  return <time dateTime={value}>{formatRailwayTime(value)}</time>
}

// A native table, like the board. The state dot is a labelled image, so the timeline reads as departed,
// next or upcoming without relying on its colour. A non-calling stop says "Does not stop" in words; a
// calling stop after an early termination says "Not served", as design file 11 does. Expected and actual
// times are the API's; the client does not calculate them.
export default function StopList({ rows, interchangeStationIds }: StopListProps) {
  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <caption className="sr-only">Stop timeline</caption>
        <thead>
          <tr>
            <th scope="col" className={styles.markerHeader}>
              <span className="sr-only">Progress</span>
            </th>
            <th scope="col">Station</th>
            <th scope="col">Scheduled</th>
            <th scope="col">Expected</th>
            <th scope="col">Actual departure</th>
            <th scope="col">Platform</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.sequence}
              className={
                row.state === 'next'
                  ? styles.rowNext
                  : row.state === 'notServed'
                    ? styles.rowNotServed
                    : row.state === 'notCalling'
                      ? styles.rowNotCalling
                      : undefined
              }
            >
              <td className={`${styles.marker} ${row.state === 'departed' ? styles.markerDeparted : ''}`}>
                {row.isCalling ? (
                  <span
                    className={`${styles.dot} ${DOT_CLASS[row.state] ?? ''}`}
                    role="img"
                    aria-label={STATE_LABELS[row.state]}
                  />
                ) : null}
              </td>
              <td>
                <span className={styles.station}>
                  <StationName
                    name={row.stationName}
                    isInterchange={
                      row.stationId !== null && interchangeStationIds?.has(row.stationId) === true
                    }
                  />
                  {row.state === 'next' && <span className={styles.tag}>Next stop</span>}
                  {row.state === 'notCalling' && (
                    <span className={styles.mutedTag}>Does not stop</span>
                  )}
                  {row.state === 'notServed' && <span className={styles.mutedTag}>Not served</span>}
                </span>
              </td>
              <td>{row.isCalling ? renderTime(row.scheduled) : '—'}</td>
              <td>
                {row.state === 'notServed'
                  ? 'Not served'
                  : row.isCalling
                    ? renderTime(row.expected)
                    : '—'}
              </td>
              <td>
                {row.state === 'notServed' || !row.isCalling ? '—' : renderTime(row.actualDeparture)}
              </td>
              <td>
                {row.platformNumber ?? '—'}
                {row.platformChangedAt !== null && (
                  <span className={styles.changed}>
                    Changed at{' '}
                    <time dateTime={row.platformChangedAt}>
                      {formatRailwayTime(row.platformChangedAt)}
                    </time>
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
