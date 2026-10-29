import { Link, Outlet, useParams } from 'react-router'
import ForbiddenPage from '@/app/pages/ForbiddenPage'
import ChangeHistory from '@/features/publishing/components/ChangeHistory'
import PublishActions from '@/features/publishing/components/PublishActions'
import { useCanPublish } from '@/features/publishing/hooks/useCanPublish'
import { toChangeViews, type ChangeView } from '@/features/publishing/lib/changeHistory'
import { useStations } from '@/features/stations/hooks/useStations'
import { interchangeStationIds } from '@/features/stations/lib/stationLookup'
import { isForbiddenRole } from '@/shared/api/ApiError'
import EmptyState from '@/shared/ui/EmptyState'
import FreshnessNote from '@/shared/ui/FreshnessNote'
import QueryState from '@/shared/ui/QueryState'
import JourneyDetailHeader from '../components/JourneyDetailHeader'
import JourneyProgress from '../components/JourneyProgress'
import StopList from '../components/StopList'
import { useJourney } from '../hooks/useJourney'
import {
  toJourneyProgress,
  toPlatformNumbers,
  toStopRows,
} from '../lib/journeyStops'
import type { JourneyDetail } from '../types'
import styles from './JourneyDetailPage.module.css'

// The journey's own page (M-02, M-09): the service name is the h1, the facts and the stops follow. The
// controller reaches it from the board. One request supplies the journey, its stops and its change
// history, so the page no longer joins a second changes request or a station lookup.
export default function JourneyDetailPage() {
  const { journeyId = '' } = useParams()
  const journey = useJourney(journeyId)
  const canPublish = useCanPublish()
  const stations = useStations()

  // The Interchange tag is reference data, not journey data. While the stations query loads or if it
  // fails, the tag is simply absent; the stop list and the rest of the detail never wait for it.
  const interchangeIds =
    stations.data === undefined ? undefined : interchangeStationIds(stations.data)

  // As on the board: once the journey has loaded, a failed browser refresh keeps it on screen with a note.
  // The API's own staleness flag is separate and is shown in the header.
  const isRefreshFailed = journey.isError && journey.data !== undefined

  // The operations reads are Network Controller-only. A 403 is the signed-in person's role, not a
  // transient failure, so it goes to the app's forbidden page instead of a retryable error.
  if (isForbiddenRole(journey.error)) {
    return <ForbiddenPage />
  }

  // The API refuses a correction on a completed journey, on a correction, and on a change that already has
  // one; toChangeViews marks exactly those, so the action only appears where the server accepts it. The
  // correction drawer owns the request; this page only supplies the link with the chosen change.
  function correctionHref(change: ChangeView): string {
    return `/journeys/${encodeURIComponent(journeyId)}/publish/correction?changeId=${encodeURIComponent(change.id)}`
  }

  return (
    <section className={styles.page} aria-labelledby="journey-detail-title">
      <Link to="/board" className={styles.back}>
        Back to the live board
      </Link>

      <header className={styles.header}>
        <h1 id="journey-detail-title" className={styles.title}>
          {journey.data?.serviceName ?? 'Journey'}
        </h1>

        <div className={styles.freshness}>
          <FreshnessNote
            updatedAt={journey.dataUpdatedAt}
            isFetching={journey.isFetching}
            onRefresh={() => void journey.refetch()}
          />
          {journey.data?.isStale === true && <span className={styles.stale}>Stale</span>}
        </div>
      </header>

      {isRefreshFailed && (
        <p role="alert" className={styles.alert}>
          Could not refresh the journey. The times below are the last update.
        </p>
      )}

      <QueryState<JourneyDetail>
        isPending={journey.isPending}
        isError={journey.isError && journey.data === undefined}
        error={journey.error}
        data={journey.data}
        onRetry={journey.refetch}
        isEmpty={() => false}
        emptyTitle="Journey not found"
        notFoundTitle="Journey not found"
      >
        {(detail) => {
          const rows = toStopRows(detail.stops, detail.changes, detail.status)
          const progress = toJourneyProgress(rows)
          const showProgress = detail.status === 'running' || detail.status === 'terminated'

          return (
            <>
              <JourneyDetailHeader journey={detail} />

              {showProgress && <JourneyProgress progress={progress} />}

              <PublishActions journeyId={journeyId} status={detail.status} canPublish={canPublish} />

              <div className={styles.columns}>
                <section aria-labelledby="journey-stops-title" className={styles.stopsColumn}>
                  <h2 id="journey-stops-title" className={styles.sectionTitle}>
                    Stops
                  </h2>
                  {rows.length === 0 ? (
                    <EmptyState title="No stops listed" />
                  ) : (
                    <StopList rows={rows} interchangeStationIds={interchangeIds} />
                  )}
                </section>

                <div className={styles.historyColumn}>
                  <ChangeHistory
                    changes={toChangeViews(detail.changes, toPlatformNumbers(detail.stops), detail.status)}
                    correctionHref={canPublish ? correctionHref : undefined}
                  />
                </div>
              </div>
            </>
          )
        }}
      </QueryState>

      {/* The publish drawers are child routes, so they render here over the detail. */}
      <Outlet />
    </section>
  )
}
