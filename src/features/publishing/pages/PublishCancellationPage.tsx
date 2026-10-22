import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { useCurrentUser } from '@/app/providers/AuthContext'
import { useJourney } from '@/features/journeys/hooks/useJourney'
import type { JourneyDetail } from '@/features/journeys/types'
import { isMocked } from '@/shared/api/mockSwitch'
import { serviceDateFromParam } from '@/shared/lib/railwayTime'
import QueryState from '@/shared/ui/QueryState'
import CancellationForm from '../components/CancellationForm'
import PublishConfirmDialog from '../components/PublishConfirmDialog'
import PublishPageHeader from '../components/PublishPageHeader'
import { usePublishCancellation } from '../hooks/usePublishCancellation'
import { publishErrorMessage } from '../lib/publishErrorMessage'
import styles from './PublishCancellationPage.module.css'

// A cancellation has no fields, so there is no draft and no unsaved-changes guard. The dialog is the gate.
export default function PublishCancellationPage() {
  const { journeyId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const serviceDate = serviceDateFromParam(searchParams.get('date'))
  const navigate = useNavigate()
  const publisher = useCurrentUser()
  const journey = useJourney(journeyId, serviceDate)
  const publish = usePublishCancellation(journeyId)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const serviceName = journey.data?.serviceName ?? 'This journey'

  function handleSubmit() {
    publish.reset()
    setIsDialogOpen(true)
  }

  async function handleConfirm() {
    try {
      const change = await publish.mutateAsync()
      navigate(`/journeys/${encodeURIComponent(journeyId)}?date=${encodeURIComponent(serviceDate)}`, {
        state: { published: { type: 'cancellation', publishedAt: change.publishedAt } },
      })
    } catch {
      // The failure is shown from publish.error inside the dialog, so the rejection only has to be stopped here.
    }
  }

  return (
    <section className={styles.page} aria-labelledby="publish-cancellation-title">
      <PublishPageHeader
        titleId="publish-cancellation-title"
        title="Publish a cancellation"
        serviceName={journey.data?.serviceName ?? null}
        journeyId={journeyId}
        serviceDate={serviceDate}
        isMocked={isMocked('operations')}
      />

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
        {() => <CancellationForm journeyName={serviceName} isPending={publish.isPending} onSubmit={handleSubmit} />}
      </QueryState>

      <PublishConfirmDialog
        isOpen={isDialogOpen}
        title="Cancel this journey?"
        summary={`${serviceName} will be cancelled. A journey that has departed cannot be cancelled.`}
        publishedBy={publisher.displayName}
        confirmLabel="Cancel journey"
        confirmVariant="danger"
        isConfirming={publish.isPending}
        error={publish.error ? publishErrorMessage(publish.error) : null}
        onConfirm={() => void handleConfirm()}
        onCancel={() => setIsDialogOpen(false)}
      />
    </section>
  )
}
