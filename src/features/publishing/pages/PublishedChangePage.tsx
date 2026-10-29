import type { ReactNode } from 'react'
import EmptyState from '@/shared/ui/EmptyState'
import LoadingIndicator from '@/shared/ui/LoadingIndicator'
import QueryState from '@/shared/ui/QueryState'
import { Link, useParams } from 'react-router'
import ForbiddenPage from '@/app/pages/ForbiddenPage'
import { useJourney } from '@/features/journeys/hooks/useJourney'
import type { JourneyDetail } from '@/features/journeys/types'
import { useStations } from '@/features/stations/hooks/useStations'
import { isForbiddenRole } from '@/shared/api/ApiError'
import { formatRailwayTime } from '@/shared/lib/railwayTime'
import { toChangeViews, type ChangeView } from '../lib/changeHistory'
import { toPlatformNumbers } from '@/features/journeys/lib/journeyStops'
import { platformNumbersOfStations } from '../lib/publishedValues'
import { CHANGE_TYPE_LABELS } from '../types'
import styles from './PublishedChangePage.module.css'

type SummaryItemProps = {
  label: string
  children: ReactNode
}

function SummaryItem({ label, children }: SummaryItemProps) {
  return (
    <div className={styles.item}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

// The design's propagation page, without the delivery section: no endpoint reports per-channel delivery, so
// the page states the change and where it came from and leaves delivery out rather than inventing states.
// The change is read from the journey detail query by id, so a reload of the URL works.
export default function PublishedChangePage() {
  const { journeyId = '', changeId = '' } = useParams()
  const journey = useJourney(journeyId)
  const stations = useStations()

  if (isForbiddenRole(journey.error)) {
    return <ForbiddenPage />
  }

  const stationNumbers = platformNumbersOfStations(stations.data ?? [])

  return (
    <section className={styles.page}>
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
          // The stop rows know their own platforms; the station list knows the rest, including the platform
          // a change introduced. Both are keyed by id, so merging them costs nothing.
          const platformNumbers = new Map([...stationNumbers, ...toPlatformNumbers(detail.stops)])
          const views = toChangeViews(detail.changes, platformNumbers, detail.status)
          const view = views.find((candidate) => candidate.id === changeId)
          if (view === undefined) {
            // The publish invalidates the journey, so the cache can hold the old history for a moment after
            // the redirect. A fetch in flight is a reason to wait, not a reason to say the change is missing.
            if (journey.isFetching) {
              return <LoadingIndicator />
            }

            return (
              <EmptyState
                title="Change not found"
                description="This change is not in the journey's change history."
              />
            )
          }

          return <PublishedChange view={view} serviceName={detail.serviceName} journeyId={journeyId} />
        }}
      </QueryState>
    </section>
  )
}

function PublishedChange({
  view,
  serviceName,
  journeyId,
}: {
  view: ChangeView
  serviceName: string | null
  journeyId: string
}) {
  const title = `${CHANGE_TYPE_LABELS[view.type]} published at ${formatRailwayTime(view.publishedAt)}`
  const journeyPath = `/journeys/${encodeURIComponent(journeyId)}`

  return (
    <>
      <header className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>
          {serviceName === null ? 'The change is published.' : `${serviceName} · the change is published.`}
        </p>
      </header>

      <dl className={styles.summary}>
        <SummaryItem label="Change">{view.summary}</SummaryItem>
        <SummaryItem label="Published by">{view.publisher}</SummaryItem>
        <SummaryItem label="Provenance">
          <span className={styles.tag}>{view.provenanceLabel}</span>
        </SummaryItem>
        <SummaryItem label="Published at">
          <time dateTime={view.publishedAt}>{formatRailwayTime(view.publishedAt, true)}</time>
        </SummaryItem>
      </dl>

      <div className={styles.actions}>
        <Link to="/board" className={styles.secondaryLink}>
          Back to the live board
        </Link>
        <Link to={journeyPath} className={styles.primaryLink}>
          View journey
        </Link>
      </div>
    </>
  )
}
