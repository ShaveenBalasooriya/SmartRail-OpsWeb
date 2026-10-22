import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { useCanPublish } from '@/features/publishing/hooks/useCanPublish'
import PublishActions from '@/features/publishing/components/PublishActions'
import { publishedNoticeFrom, publishedNoticeText, type PublishedNotice } from '@/features/publishing/lib/publishedNotice'
import { useStations } from '@/features/stations/hooks/useStations'
import { indexStations } from '@/features/stations/lib/stationLookup'
import { serviceDateFromParam } from '@/shared/lib/railwayTime'
import EmptyState from '@/shared/ui/EmptyState'
import FreshnessNote from '@/shared/ui/FreshnessNote'
import QueryState from '@/shared/ui/QueryState'
import JourneyDetailHeader from '../components/JourneyDetailHeader'
import StopList from '../components/StopList'
import { useJourney } from '../hooks/useJourney'
import { toStopRows } from '../lib/journeyStops'
import type { JourneyDetail } from '../types'
import styles from './JourneyDetailPage.module.css'

// The journey's own page (M-02, M-09): the service name is the h1, the facts and the stops follow. Both
// roles reach it from the board.
export default function JourneyDetailPage() {
  const { journeyId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const serviceDate = serviceDateFromParam(searchParams.get('date'))
  const journey = useJourney(journeyId, serviceDate)
  const stations = useStations()
  const stationIndex = useMemo(() => indexStations(stations.data ?? []), [stations.data])
  const canPublish = useCanPublish()

  const location = useLocation()
  const navigate = useNavigate()
  // Read once from the redirect's state. The state is then cleared from the history entry, so a refresh does
  // not announce the same publish again.
  const [publishedNotice] = useState<PublishedNotice | null>(() => publishedNoticeFrom(location.state))
  useEffect(() => {
    if (location.state !== null) {
      navigate(location.pathname + location.search, { replace: true, state: null })
    }
  }, [location.state, location.pathname, location.search, navigate])

  // As on the board: once the journey has loaded, a failed refresh keeps it on screen with a note.
  const isStale = journey.isError && journey.data !== undefined

  // A loaded journey always has a body to show, even with no stops, so the empty case is handled in the
  // body and not by QueryState. The waiting on stations stops every row from flashing "Unknown station".
  return (
    <section className={styles.page} aria-labelledby="journey-detail-title">
      <Link to="/board" className={styles.back}>
        Back to the live board
      </Link>

      <header className={styles.header}>
        <h1 id="journey-detail-title" className={styles.title}>
          {journey.data?.serviceName ?? 'Journey'}
        </h1>

        <FreshnessNote
          updatedAt={journey.dataUpdatedAt}
          isFetching={journey.isFetching}
          onRefresh={() => void journey.refetch()}
        />
      </header>

      {isStale && (
        <p role="alert" className={styles.alert}>
          Could not refresh the journey. The times below are the last update.
        </p>
      )}

      {publishedNotice !== null && (
        <p role="status" className={styles.notice}>
          {publishedNoticeText(publishedNotice)}
        </p>
      )}

      {stations.isError && <p className={styles.note}>Station names could not be loaded.</p>}

      <QueryState<JourneyDetail>
        isPending={journey.isPending || stations.isPending}
        isError={journey.isError && journey.data === undefined}
        error={journey.error}
        data={journey.data}
        onRetry={journey.refetch}
        isEmpty={() => false}
        emptyTitle="Journey not found"
        notFoundTitle="Journey not found"
      >
        {(detail) => {
          const rows = toStopRows(detail.stops, stationIndex)

          return (
            <>
              <JourneyDetailHeader journey={detail} />

              <PublishActions
                journeyId={journeyId}
                serviceDate={serviceDate}
                status={detail.status}
                canPublish={canPublish}
              />

              <section aria-labelledby="journey-stops-title" className={styles.stops}>
                <h2 id="journey-stops-title" className={styles.sectionTitle}>
                  Stops
                </h2>
                {rows.length === 0 ? <EmptyState title="No stops listed" /> : <StopList rows={rows} />}
              </section>
            </>
          )
        }}
      </QueryState>
    </section>
  )
}
