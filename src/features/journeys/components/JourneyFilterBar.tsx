import {
  DIRECTION_LABELS,
  isJourneyDirectionFilter,
  isJourneyStatusFilter,
  JOURNEY_STATUS_LABELS,
  JOURNEY_STATUS_VALUES,
  SERVICE_DIRECTION_VALUES,
  type JourneyDirectionFilter,
  type JourneyStatusFilter,
} from '../types'
import type { LineOption } from '../lib/filterJourneys'
import styles from './JourneyFilterBar.module.css'

type JourneyFilterBarProps = {
  search: string
  onSearchChange: (value: string) => void
  lines: LineOption[]
  line: string
  onLineChange: (value: string) => void
  direction: JourneyDirectionFilter
  onDirectionChange: (value: JourneyDirectionFilter) => void
  status: JourneyStatusFilter
  onStatusChange: (value: JourneyStatusFilter) => void
}

// Renders inside the FilterBar layout. Labels are real <label> elements, never placeholders. Each select
// validates the DOM's string before it reaches typed state, so an unknown value cannot enter the URL.
export default function JourneyFilterBar({
  search,
  onSearchChange,
  lines,
  line,
  onLineChange,
  direction,
  onDirectionChange,
  status,
  onStatusChange,
}: JourneyFilterBarProps) {
  return (
    <>
      <div className={`${styles.field} ${styles.wide}`}>
        <label htmlFor="journey-search">Search service</label>
        <input
          id="journey-search"
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="journey-line">Line</label>
        <select
          id="journey-line"
          value={line}
          onChange={(event) => onLineChange(event.target.value)}
        >
          <option value="all">All lines</option>
          {lines.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor="journey-direction">Direction</label>
        <select
          id="journey-direction"
          value={direction}
          onChange={(event) => {
            const next = event.target.value
            if (isJourneyDirectionFilter(next)) {
              onDirectionChange(next)
            }
          }}
        >
          <option value="all">Both directions</option>
          {SERVICE_DIRECTION_VALUES.map((value) => (
            <option key={value} value={value}>
              {DIRECTION_LABELS[value]}
            </option>
          ))}
        </select>
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
