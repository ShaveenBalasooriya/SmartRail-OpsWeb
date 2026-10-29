import type { Journey } from '../types'
import JourneyTableRow from './JourneyTableRow'
import styles from './JourneyTable.module.css'

type JourneyTableProps = {
  journeys: Journey[]
  // The railway date the rows belong to, for the visually hidden caption.
  dateLabel: string
}

// A native table. The caption is visually hidden but read first, so the table names the day it covers. The
// last header holds only an icon link, so its visible label is hidden text. The design's "Departs" column is
// deliberately absent: the operations feed has no scheduled departure time to fill it with.
export default function JourneyTable({ journeys, dateLabel }: JourneyTableProps) {
  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <caption className="sr-only">Journeys for {dateLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Service</th>
            <th scope="col">Direction</th>
            <th scope="col">Status</th>
            <th scope="col">Last and next station</th>
            <th scope="col">Early or late</th>
            <th scope="col">Last updated</th>
            <th scope="col" className={styles.viewCell}>
              <span className="sr-only">View journey</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {journeys.map((journey) => (
            <JourneyTableRow key={journey.id} journey={journey} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
