import EmptyState from '@/shared/ui/EmptyState'
import FilterBar from '@/shared/ui/FilterBar'
import FreshnessNote from '@/shared/ui/FreshnessNote'
import QueryState from '@/shared/ui/QueryState'
import { railwayDateKey } from '@/shared/lib/railwayTime'
import JourneyFilterBar from '../components/JourneyFilterBar'
import JourneyTable from '../components/JourneyTable'
import { useJourneyFilters } from '../hooks/useJourneyFilters'
import { useJourneys } from '../hooks/useJourneys'
import { filterJourneys } from '../lib/filterJourneys'
import type { Journey } from '../types'
import styles from './LiveBoardPage.module.css'

// The default landing page for every role. It shows today's journeys and says how fresh they are (M-02).
export default function LiveBoardPage() {
  const serviceDate = railwayDateKey(new Date())
  const journeys = useJourneys(serviceDate)
  const { search, setSearch, status, setStatus, debouncedSearch } = useJourneyFilters()

  // Once data has loaded, a failed refresh keeps the last-known list on screen with a note, instead of
  // replacing the board with an error (no blank screens).
  const isStale = journeys.isError && journeys.data !== undefined

  return (
    <section className={styles.page} aria-labelledby="live-board-title">
      <header className={styles.header}>
        <div>
          <h1 id="live-board-title" className={styles.title}>
            Live board
          </h1>
          <p className={styles.subtitle}>Journeys for {serviceDate}</p>
        </div>

        <FreshnessNote
          updatedAt={journeys.dataUpdatedAt}
          isFetching={journeys.isFetching}
          onRefresh={() => void journeys.refetch()}
        />
      </header>

      {isStale && (
        <p role="alert" className={styles.stale}>
          Could not refresh the board. The times below are the last update.
        </p>
      )}

      <FilterBar>
        <JourneyFilterBar
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
        />
      </FilterBar>

      <QueryState<Journey[]>
        isPending={journeys.isPending}
        isError={journeys.isError && journeys.data === undefined}
        error={journeys.error}
        data={journeys.data}
        onRetry={journeys.refetch}
        isEmpty={(all) => all.length === 0}
        emptyTitle="No journeys today"
        emptyDescription="The timetable has no journeys for this railway day."
      >
        {(all) => {
          const visible = filterJourneys(all, { status, search: debouncedSearch })
          const statusReported = all.some((journey) => journey.status !== null)

          return (
            <>
              {!statusReported && (
                <p className={styles.note}>
                  Live status is not available yet, so status filters match nothing. Scheduled times are shown.
                </p>
              )}
              {visible.length === 0 ? (
                // The second empty state: the server returned journeys, but the page's filters removed them all.
                <EmptyState title="No matching journeys" description="Try another status or clear the search." />
              ) : (
                <JourneyTable journeys={visible} />
              )}
            </>
          )
        }}
      </QueryState>
    </section>
  )
}
