import Button from '@/shared/components/Button'
import styles from './Pagination.module.css'

type PaginationProps = {
  page: number
  totalPages: number
  totalCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
  onPrevious: () => void
  onNext: () => void
}

// The API owns the page count; the buttons only follow hasPreviousPage and hasNextPage rather than
// guessing from the page number.
export default function Pagination({
  page,
  totalPages,
  totalCount,
  hasPreviousPage,
  hasNextPage,
  onPrevious,
  onNext,
}: PaginationProps) {
  const entryLabel = totalCount === 1 ? 'entry' : 'entries'

  return (
    <nav className={styles.pagination} aria-label="Audit pages">
      <Button variant="secondary" onClick={onPrevious} disabled={!hasPreviousPage}>
        Previous
      </Button>

      <p className={styles.summary} aria-live="polite">
        Page {page} of {totalPages}, {totalCount} {entryLabel}
      </p>

      <Button variant="secondary" onClick={onNext} disabled={!hasNextPage}>
        Next
      </Button>
    </nav>
  )
}
