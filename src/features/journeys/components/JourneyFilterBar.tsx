import {
  isJourneyStatusFilter,
  JOURNEY_STATUS_LABELS,
  JOURNEY_STATUS_VALUES,
  type JourneyStatusFilter,
} from '../types'
import styles from './JourneyFilterBar.module.css'

type JourneyFilterBarProps = {
  search: string
  onSearchChange: (value: string) => void
  status: JourneyStatusFilter
  onStatusChange: (value: JourneyStatusFilter) => void
}

// Renders inside the FilterBar layout. Labels are real <label> elements, never placeholders.
export default function JourneyFilterBar({ search, onSearchChange, status, onStatusChange }: JourneyFilterBarProps) {
  return (
    <>
      <div className={styles.field}>
        <label htmlFor="journey-search">Search service or line</label>
        <input
          id="journey-search"
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="journey-status">Status</label>
        <select
          id="journey-status"
          value={status}
          onChange={(event) => {
            const next = event.target.value
            if (isJourneyStatusFilter(next)) {
              onStatusChange(next)
            }
          }}
        >
          <option value="all">All statuses</option>
          {JOURNEY_STATUS_VALUES.map((value) => (
            <option key={value} value={value}>
              {JOURNEY_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}
