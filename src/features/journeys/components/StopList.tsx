import StationName from '@/features/stations/components/StationName'
import { formatRailwayTime } from '@/shared/lib/railwayTime'
import type { StopRow } from '../lib/journeyStops'
import styles from './StopList.module.css'

type StopListProps = {
  rows: StopRow[]
}

// A dash is printed rather than an empty cell, so a missing value is visible and not mistaken for a blank
// row. The origin stop has no arrival, so the dash is the normal case there, not an error.
function renderTime(value: string | null) {
  if (value === null) {
    return '—'
  }

  return <time dateTime={value}>{formatRailwayTime(value)}</time>
}

// A native table, like the board. Non-calling stops say "Passes" in the time columns, so the row reads
// as a plain fact rather than an empty time.
export default function StopList({ rows }: StopListProps) {
  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <caption className="sr-only">Stops</caption>
        <thead>
          <tr>
            <th scope="col">Stop number</th>
            <th scope="col">Station</th>
            <th scope="col">Arrives</th>
            <th scope="col">Departs</th>
            <th scope="col">Platform</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.sequence}>
              <td>{row.sequence}</td>
              <td>
                <StationName name={row.stationName} isInterchange={row.isInterchange} />
              </td>
              <td>{row.isCalling ? renderTime(row.arrival) : 'Passes'}</td>
              <td>{row.isCalling ? renderTime(row.departure) : 'Passes'}</td>
              <td>{row.platformNumber ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
