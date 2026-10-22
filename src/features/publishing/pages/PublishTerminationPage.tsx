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
import PublishConfirmDialog from '../components/PublishConfirmDialog'
import PublishPageHeader from '../components/PublishPageHeader'
import TerminationForm from '../components/TerminationForm'
import UnsavedChangesDialog from '../components/UnsavedChangesDialog'
import { usePublishTermination } from '../hooks/usePublishTermination'
import { publishErrorMessage } from '../lib/publishErrorMessage'
import { toTerminationStopOptions } from '../lib/stopOptions'
import type { TerminationInput } from '../types'
import styles from './PublishTerminationPage.module.css'

// The same flow as the delay page: the form holds a draft, the dialog confirms it, and a failure keeps the
// draft with the dialog's message. The termination is irreversible for the train's journey, so the dialog's
// confirm button is the danger variant.
export default function PublishTerminationPage() {
  const { journeyId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const serviceDate = serviceDateFromParam(searchParams.get('date'))
  const navigate = useNavigate()
  const publisher = useCurrentUser()
  const journey = useJourney(journeyId, serviceDate)
  const stations = useStations()
  const stationIndex = useMemo(() => indexStations(stations.data ?? []), [stations.data])
  const stops = useMemo(
    () => (journey.data ? toTerminationStopOptions(journey.data.stops, stationIndex) : []),
    [journey.data, stationIndex],
  )
  const publish = usePublishTermination(journeyId)

  const [isDirty, setIsDirty] = useState(false)
  const { blocker, markSubmitted } = useBlockUnsavedChanges(isDirty)
  const [draft, setDraft] = useState<TerminationInput | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  function handleSubmit(input: TerminationInput) {
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
        state: { published: { type: 'termination', publishedAt: change.publishedAt } },
      })
    } catch {
      // The failure is shown from publish.error inside the dialog, so the rejection only has to be stopped here.
    }
  }

  const draftStop = stops.find((stop) => stop.sequence === draft?.lastStopSequence)
  const summary =
    draft === null
      ? ''
      : `The train ends its journey after ${draftStop?.label ?? `stop ${draft.lastStopSequence}`}. Later stops are no longer served.`

  return (
    <section className={styles.page} aria-labelledby="publish-termination-title">
      <PublishPageHeader
        titleId="publish-termination-title"
        title="Publish an early termination"
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
          <TerminationForm
            stops={stops}
            isPending={publish.isPending}
            onSubmit={handleSubmit}
            onDirtyChange={setIsDirty}
          />
        )}
      </QueryState>

      <PublishConfirmDialog
        isOpen={isDialogOpen && draft !== null}
        title="Publish this early termination?"
        summary={summary}
        publishedBy={publisher.displayName}
        confirmLabel="Publish termination"
        confirmVariant="danger"
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
