import Button from '@/shared/components/Button'
import { formatRailwayTime } from '@/shared/lib/railwayTime'
import styles from './FreshnessNote.module.css'

type FreshnessNoteProps = {
  // TanStack Query's dataUpdatedAt, in milliseconds. 0 means no data has arrived yet.
  updatedAt: number
  isFetching: boolean
  onRefresh: () => void
}

// Every screen that shows server data says how fresh it is and offers a refresh (M-02), so the wording
// and the disabled-while-fetching behaviour stay the same on each.
export default function FreshnessNote({ updatedAt, isFetching, onRefresh }: FreshnessNoteProps) {
  return (
    <div className={styles.freshness}>
      {updatedAt > 0 && (
        <p>
          Last updated{' '}
          <time dateTime={new Date(updatedAt).toISOString()}>{formatRailwayTime(new Date(updatedAt), true)}</time>
        </p>
      )}
      <Button variant="secondary" onClick={onRefresh} disabled={isFetching}>
        {isFetching ? 'Refreshing…' : 'Refresh'}
      </Button>
    </div>
  )
}
