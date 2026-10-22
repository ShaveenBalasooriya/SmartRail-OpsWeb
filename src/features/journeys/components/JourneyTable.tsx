import type { Journey } from '../types'
import JourneyTableRow from './JourneyTableRow'
import styles from './JourneyTable.module.css'

type JourneyTableProps = {
  journeys: Journey[]
}

// A native table for now. Virtualization and the CSS-grid row layout arrive with the performance pass,
// when the list grows large enough to need them.
export default function JourneyTable({ journeys }: JourneyTableProps) {
  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <caption className="sr-only">Today&apos;s journeys</caption>
        <thead>
          <tr>
            <th scope="col">Departs</th>
            <th scope="col">Service</th>
            <th scope="col">Line</th>
            <th scope="col">Direction</th>
            <th scope="col">Status</th>
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
