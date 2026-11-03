import EmptyState from '@/shared/ui/EmptyState'
import FilterBar from '@/shared/ui/FilterBar'
import ForbiddenPage from '@/app/pages/ForbiddenPage'
import FreshnessNote from '@/shared/ui/FreshnessNote'
import QueryState from '@/shared/ui/QueryState'
import { isForbiddenRole } from '@/shared/api/ApiError'
import { railwayDateKey } from '@/shared/lib/railwayTime'
import JourneyFilterBar from '../components/JourneyFilterBar'
import JourneySummary from '../components/JourneySummary'
import JourneyTable from '../components/JourneyTable'
import { useJourneyFilters } from '../hooks/useJourneyFilters'
import { useJourneys } from '../hooks/useJourneys'
import { filterJourneys, listLineOptions } from '../lib/filterJourneys'
import { summariseJourneys } from '../lib/summariseJourneys'
import type { Journey } from '../types'
import styles from './LiveBoardPage.module.css'

type LiveBoardPageProps = {
  // The auditor's read-only variant (design file 23). The board has no write actions today, so this only
  // changes the page's own wording; if one is ever added, this is the flag that keeps it from an auditor.
  readOnly?: boolean
}

// The landing page for the Network Controller role. The operations list is today's board and takes no
// date, so the page names the current railway day rather than a day the API cannot be asked for. Status,
// delay, guard and the last/next station all come from the API as they stand. The read is controller-only,
// so a role the API refuses sees the forbidden page above.
export default function LiveBoardPage({ readOnly = false }: LiveBoardPageProps) {
  const journeys = useJourneys()
  const { search, setSearch, line, setLine, direction, setDirection, status, setStatus, debouncedSearch } =
    useJourneyFilters()

  // The operations reads are Network Controller-only. A 403 is the signed-in person's role, not a
  // transient failure, so it goes to the app's forbidden page instead of a retryable error.
  if (isForbiddenRole(journeys.error)) {
    return <ForbiddenPage />
  }

  // Once data has loaded, a failed browser refresh keeps the last-known list on screen with a note, instead
  // of replacing the board with an error (no blank screens). The API's own staleness flag is separate and
  // is shown per journey.
  const isRefreshFailed = journeys.isError && journeys.data !== undefined
  const loaded = journeys.data
  const today = railwayDateKey(new Date())
  const lineOptions = loaded === undefined ? [] : listLineOptions(loaded)
  // A shared link can name a line this board no longer has. Such a value is treated as "all", the same way
  // an unknown status or direction is, so the select and the table cannot disagree.
  const activeLine =
    line === 'all' || lineOptions.some((option) => option.value === line) ? line : 'all'
  const subtitle = readOnly
    ? `Journeys for ${today}`
    : `Journeys for ${today} · updates arrive automatically`

  return (
    <section className={styles.page} aria-labelledby="live-board-title">
      <header className={styles.header}>
        <div>
          <h1 id="live-board-title" className={styles.title}>
            {readOnly ? 'Live board' : 'Live operations board'}
          </h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>

        <FreshnessNote
          updatedAt={journeys.dataUpdatedAt}
          isFetching={journeys.isFetching}
          onRefresh={() => void journeys.refetch()}
        />
      </header>

      {isRefreshFailed && (
        <p role="alert" className={styles.refreshError}>
          Could not refresh the board. The times below are the last update.
        </p>
      )}

      {/* The tiles count the loaded rows only, so they are absent until the first response arrives. */}
      {loaded !== undefined && <JourneySummary counts={summariseJourneys(loaded)} />}

      <FilterBar>
        <JourneyFilterBar
          search={search}
          onSearchChange={setSearch}
          lines={lineOptions}
          line={activeLine}
          onLineChange={setLine}
          direction={direction}
          onDirectionChange={setDirection}
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
        emptyTitle="No journeys for this date"
        emptyDescription="The timetable has no journeys for this railway day."
      >
        {(all) => {
          const visible = filterJourneys(all, {
            status,
            direction,
            line: activeLine,
            search: debouncedSearch,
          })

          return visible.length === 0 ? (
            // The second empty state: the server returned journeys, but the page's filters removed them all.
            <EmptyState title="No matching journeys" description="Try another status or clear the search." />
          ) : (
            <JourneyTable journeys={visible} dateLabel={today} />
          )
        }}
      </QueryState>
    </section>
  )
}
