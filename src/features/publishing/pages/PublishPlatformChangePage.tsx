import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { useCurrentUser } from '@/app/providers/AuthContext'
import { useJourney } from '@/features/journeys/hooks/useJourney'
import type { JourneyDetail } from '@/features/journeys/types'
import { useStations } from '@/features/stations/hooks/useStations'
import { indexStations, platformNumber } from '@/features/stations/lib/stationLookup'
import { isMocked } from '@/shared/api/mockSwitch'
import { useBlockUnsavedChanges } from '@/shared/hooks/useBlockUnsavedChanges'
import { serviceDateFromParam } from '@/shared/lib/railwayTime'
import QueryState from '@/shared/ui/QueryState'
import PlatformChangeForm from '../components/PlatformChangeForm'
import PublishConfirmDialog from '../components/PublishConfirmDialog'
import PublishPageHeader from '../components/PublishPageHeader'
import UnsavedChangesDialog from '../components/UnsavedChangesDialog'
import { usePublishPlatformChange } from '../hooks/usePublishPlatformChange'
import { publishErrorMessage } from '../lib/publishErrorMessage'
import { toStopOptions } from '../lib/stopOptions'
import type { PlatformChangeInput } from '../types'
import styles from './PublishPlatformChangePage.module.css'

// The form holds a draft until the dialog confirms it, as on the delay page.
export default function PublishPlatformChangePage() {
  const { journeyId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const serviceDate = serviceDateFromParam(searchParams.get('date'))
  const navigate = useNavigate()
  const publisher = useCurrentUser()
  const journey = useJourney(journeyId, serviceDate)
  const stations = useStations()
  const stationIndex = useMemo(() => indexStations(stations.data ?? []), [stations.data])
  const stops = useMemo(
    () => (journey.data ? toStopOptions(journey.data.stops, stationIndex) : []),
    [journey.data, stationIndex],
  )
  const publish = usePublishPlatformChange(journeyId)

  const [isDirty, setIsDirty] = useState(false)
  const { blocker, markSubmitted } = useBlockUnsavedChanges(isDirty)
  const [draft, setDraft] = useState<PlatformChangeInput | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  function handleSubmit(input: PlatformChangeInput) {
    publish.reset()
    setDraft(input)
    setIsDialogOpen(true)
  }

  async function handleConfirm() {
    if (draft === null) {
      return
    }

    try {
      const change = await publish.mutateAsync(draft)
      // Before navigate(), for the same reason as on the delay page.
      markSubmitted()
      navigate(`/journeys/${encodeURIComponent(journeyId)}?date=${encodeURIComponent(serviceDate)}`, {
        state: { published: { type: 'platform_change', publishedAt: change.publishedAt } },
      })
    } catch {
      // The failure is shown from publish.error inside the dialog, so the rejection only has to be stopped here.
    }
  }

  const draftStop = stops.find((stop) => stop.sequence === draft?.sequence)
  const fromNumber = draftStop?.platformId ? platformNumber(stationIndex, draftStop.platformId) : null
  const toNumber = draft ? platformNumber(stationIndex, draft.platformId) : null
  const summary =
    draft === null
      ? ''
      : `${draftStop?.label ?? `Stop ${draft.sequence}`} moves from platform ${fromNumber ?? 'not set'} to platform ${toNumber ?? 'unknown'}.`

  return (
    <section className={styles.page} aria-labelledby="publish-platform-title">
      <PublishPageHeader
        titleId="publish-platform-title"
        title="Publish a platform change"
        serviceName={journey.data?.serviceName ?? null}
        journeyId={journeyId}
        serviceDate={serviceDate}
        isMocked={isMocked('operations')}
      />

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
        {() => (
          <PlatformChangeForm
            stops={stops}
            stationIndex={stationIndex}
            isPending={publish.isPending}
            onSubmit={handleSubmit}
            onDirtyChange={setIsDirty}
          />
        )}
      </QueryState>

      <PublishConfirmDialog
        isOpen={isDialogOpen && draft !== null}
        title="Publish this platform change?"
        summary={summary}
        publishedBy={publisher.displayName}
        confirmLabel="Publish platform change"
        isConfirming={publish.isPending}
        error={publish.error ? publishErrorMessage(publish.error) : null}
        onConfirm={() => void handleConfirm()}
        onCancel={() => setIsDialogOpen(false)}
      />

      <UnsavedChangesDialog
        isOpen={blocker.state === 'blocked'}
        onStay={() => blocker.reset?.()}
        onLeave={() => blocker.proceed?.()}
      />
    </section>
  )
}
