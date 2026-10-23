import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { useCurrentUser } from '@/app/providers/AuthContext'
import { useJourney } from '@/features/journeys/hooks/useJourney'
import type { JourneyDetail } from '@/features/journeys/types'
import { useStations } from '@/features/stations/hooks/useStations'
import { indexStations } from '@/features/stations/lib/stationLookup'
import { isMocked } from '@/shared/api/mockSwitch'
import { useBlockUnsavedChanges } from '@/shared/hooks/useBlockUnsavedChanges'
import { serviceDateFromParam } from '@/shared/lib/railwayTime'
import QueryState from '@/shared/ui/QueryState'
import DelayForm from '../components/DelayForm'
import PublishConfirmDialog from '../components/PublishConfirmDialog'
import PublishPageHeader from '../components/PublishPageHeader'
import UnsavedChangesDialog from '../components/UnsavedChangesDialog'
import { usePublishDelay } from '../hooks/usePublishDelay'
import { publishErrorMessage } from '../lib/publishErrorMessage'
import { toStopOptions } from '../lib/stopOptions'
import type { DelayInput } from '../types'
import styles from './PublishDelayPage.module.css'

// The form holds a draft. Nothing is sent until the dialog confirms it, so a failed request keeps what the
// controller typed and the dialog shows why it failed.
export default function PublishDelayPage() {
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
  const publish = usePublishDelay(journeyId)

  const [isDirty, setIsDirty] = useState(false)
  const { blocker, markSubmitted } = useBlockUnsavedChanges(isDirty)
  const [draft, setDraft] = useState<DelayInput | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  function handleSubmit(input: DelayInput) {
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
      // Before navigate(): the blocker reads this flag in the same tick, before React re-renders.
      markSubmitted()
      navigate(`/journeys/${encodeURIComponent(journeyId)}?date=${encodeURIComponent(serviceDate)}`, {
        state: { published: { type: 'delay', publishedAt: change.publishedAt } },
      })
    } catch {
      // The failure is shown from publish.error inside the dialog, so the rejection only has to be stopped here.
    }
  }

  const draftStop = stops.find((stop) => stop.sequence === draft?.fromSequence)
  const summary =
    draft === null
      ? ''
      : `Delay of ${draft.minutes} minutes from ${draftStop?.label ?? `stop ${draft.fromSequence}`}.`

  return (
    <section className={styles.page} aria-labelledby="publish-delay-title">
      <PublishPageHeader
        titleId="publish-delay-title"
        title="Publish a delay"
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
          <DelayForm
            stops={stops}
            isPending={publish.isPending}
            onSubmit={handleSubmit}
            onDirtyChange={setIsDirty}
          />
        )}
      </QueryState>

      <PublishConfirmDialog
        isOpen={isDialogOpen && draft !== null}
        title="Publish this delay?"
        summary={summary}
        publishedBy={publisher.displayName}
        confirmLabel="Publish delay"
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
