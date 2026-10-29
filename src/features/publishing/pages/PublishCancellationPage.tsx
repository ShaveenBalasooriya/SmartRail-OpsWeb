import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useCurrentUser } from '@/app/providers/AuthContext'
import { useJourney } from '@/features/journeys/hooks/useJourney'
import { firstScheduledDeparture } from '@/features/journeys/lib/journeyStops'
import type { JourneyDetail } from '@/features/journeys/types'
import { formatRailwayTime } from '@/shared/lib/railwayTime'
import Button from '@/shared/components/Button'
import QueryState from '@/shared/ui/QueryState'
import CancellationForm from '../components/CancellationForm'
import ProvenanceNote from '../components/ProvenanceNote'
import PublishConfirmDialog from '../components/PublishConfirmDialog'
import PublishDrawer from '../components/PublishDrawer'
import ReachList from '../components/ReachList'
import ReviewList from '../components/ReviewList'
import { usePublishCancellation } from '../hooks/usePublishCancellation'
import { REACH_AUDIENCES } from '../lib/audiences'
import { publishErrorMessage } from '../lib/publishErrorMessage'

// A cancellation has no fields, so there is no draft and no unsaved-changes guard. The review dialog is the gate.
export default function PublishCancellationPage() {
  const { journeyId = '' } = useParams()
  const navigate = useNavigate()
  const publisher = useCurrentUser()
  const journey = useJourney(journeyId)
  const publish = usePublishCancellation(journeyId)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const close = useCallback(() => {
    navigate(`/journeys/${encodeURIComponent(journeyId)}`)
  }, [journeyId, navigate])

  const serviceName = journey.data?.serviceName ?? 'This journey'
  const departure = journey.data === undefined ? null : firstScheduledDeparture(journey.data.stops)
  const departureLabel = departure === null ? null : formatRailwayTime(departure)
  const summary =
    departureLabel === null
      ? `${serviceName} will be cancelled. A journey that has departed cannot be cancelled.`
      : `${serviceName} (${departureLabel}) will be cancelled. A journey that has departed cannot be cancelled.`

  function handleSubmit() {
    publish.reset()
    setIsDialogOpen(true)
  }

  async function handleConfirm() {
    try {
      const change = await publish.mutateAsync()
      navigate(`/journeys/${encodeURIComponent(journeyId)}/published/${encodeURIComponent(change.id)}`)
    } catch {
      // The failure is shown from publish.error inside the dialog, so the rejection only has to be stopped here.
    }
  }

  return (
    <>
      <PublishDrawer
        title="Cancel journey"
        serviceName={journey.data?.serviceName ?? null}
        lineName={journey.data?.lineName ?? null}
        onClose={close}
        actions={
          <>
            <Button variant="secondary" onClick={close}>
              Go back
            </Button>
            <Button variant="danger" onClick={handleSubmit} disabled={publish.isPending || journey.data === undefined}>
              {publish.isPending ? 'Publishing…' : 'Review cancellation'}
            </Button>
          </>
        }
      >
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
          {() => (
            <>
              <CancellationForm serviceName={serviceName} scheduledDeparture={departure} />
              <ReachList title="This cancellation reaches" />
              <ProvenanceNote publisherName={publisher.displayName} />
            </>
          )}
        </QueryState>
      </PublishDrawer>

      <PublishConfirmDialog
        isOpen={isDialogOpen}
        title="Cancel this journey?"
        summary={summary}
        publishedBy={publisher.displayName}
        confirmLabel="Confirm cancellation"
        cancelLabel="Go back"
        confirmVariant="danger"
        extra={<ReviewList title="This reaches:" items={REACH_AUDIENCES} />}
        isConfirming={publish.isPending}
        error={publish.error ? publishErrorMessage(publish.error) : null}
        onConfirm={() => void handleConfirm()}
        onCancel={() => setIsDialogOpen(false)}
      />
    </>
  )
}
