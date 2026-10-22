import type { ReactNode } from 'react'
import Button from '@/shared/components/Button'
import { ApiError } from '@/shared/api/ApiError'
import EmptyState from './EmptyState'
import LoadingIndicator from './LoadingIndicator'
import styles from './QueryState.module.css'

type QueryStateProps<T> = {
  isPending: boolean
  isError: boolean
  error: Error | null
  data: T | undefined
  onRetry?: () => void
  // Zero rows from the server. "No rows match the filters" is the page's job, because only the page knows the filters.
  isEmpty: (data: T) => boolean
  emptyTitle: string
  emptyDescription?: string
  // When given, a 404 gets its own state instead of the generic error.
  notFoundTitle?: string
  children: (data: T) => ReactNode
}

// Every route-level query renders through here so each page has the same four states: pending,
// error, empty and data. The render prop receives the narrowed data, so callers need no non-null assertion.
export default function QueryState<T>({
  isPending,
  isError,
  error,
  data,
  onRetry,
  isEmpty,
  emptyTitle,
  emptyDescription,
  notFoundTitle,
  children,
}: QueryStateProps<T>) {
  if (isPending) {
    return <LoadingIndicator />
  }

  if (isError) {
    if (notFoundTitle && error instanceof ApiError && error.status === 404) {
      return <EmptyState title={notFoundTitle} />
    }

    return (
      <div role="alert" className={styles.error}>
        <p className={styles.message}>{error ? error.message : 'Something went wrong. Please try again.'}</p>
        {onRetry && (
          <Button variant="secondary" onClick={() => onRetry()}>
            Try again
          </Button>
        )}
      </div>
    )
  }

  if (data === undefined) {
    return <LoadingIndicator />
  }

  if (isEmpty(data)) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  return <>{children(data)}</>
}
