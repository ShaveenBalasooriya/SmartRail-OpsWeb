import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useCurrentUser } from '@/app/providers/AuthContext'
import { useJourney } from '@/features/journeys/hooks/useJourney'
import type { JourneyDetail } from '@/features/journeys/types'
import { useStations } from '@/features/stations/hooks/useStations'
import { indexStations } from '@/features/stations/lib/stationLookup'
import Button from '@/shared/components/Button'
import { useBlockUnsavedChanges } from '@/shared/hooks/useBlockUnsavedChanges'
import QueryState from '@/shared/ui/QueryState'
import DelayForm, { type DelayDraft } from '../components/DelayForm'
import DelayPreview from '../components/DelayPreview'
import ProvenanceNote from '../components/ProvenanceNote'
import PublishConfirmDialog from '../components/PublishConfirmDialog'
import PublishDrawer from '../components/PublishDrawer'
import ReachList from '../components/ReachList'
import ReviewList from '../components/ReviewList'
import UnsavedChangesDialog from '../components/UnsavedChangesDialog'
import { usePublishDelay } from '../hooks/usePublishDelay'
import { REACH_AUDIENCES } from '../lib/audiences'
import { toDownstreamPreview } from '../lib/delayPreview'
import { publishErrorMessage } from '../lib/publishErrorMessage'
import { toNotDepartedStopOptions } from '../lib/stopOptions'
import { parseMinutes } from '../lib/validateChange'
import type { DelayInput } from '../types'
import styles from './PublishDelayPage.module.css'

const FORM_ID = 'publish-delay-form'
const EMPTY_DRAFT: DelayDraft = { fromSequence: null, minutesText: '' }

// The delay drawer: the journey detail stays mounted behind it, because the drawer is a child route of the
// detail route. The form holds a draft. Nothing is sent until the review dialog confirms it, so a failed
// request keeps what the controller typed and the dialog shows why it failed.
export default function PublishDelayPage() {
  const { journeyId = '' } = useParams()
  const navigate = useNavigate()
  const publisher = useCurrentUser()
  const journey = useJourney(journeyId)
  const stations = useStations()
  const stationIndex = useMemo(() => indexStations(stations.data ?? []), [stations.data])
  // A delay can only start at a calling stop the train has not left; the server refuses anything else.
  const stops = useMemo(
    () => (journey.data ? toNotDepartedStopOptions(journey.data.stops, stationIndex) : []),
    [journey.data, stationIndex],
  )
  const publish = usePublishDelay(journeyId)

  const [isDirty, setIsDirty] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const [draft, setDraft] = useState<DelayDraft>(EMPTY_DRAFT)
  const { blocker, markSubmitted } = useBlockUnsavedChanges(isDirty)
  const [reviewDraft, setReviewDraft] = useState<DelayInput | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const close = useCallback(() => {
    navigate(`/journeys/${encodeURIComponent(journeyId)}`)
  }, [journeyId, navigate])

  // Stable callbacks: the form reports through effects, so a new function every render would loop.
  const handleDirtyChange = useCallback((value: boolean) => setIsDirty(value), [])
  const handleValidityChange = useCallback((value: boolean) => setIsValid(value), [])
  const handleDraftChange = useCallback((value: DelayDraft) => setDraft(value), [])

  const minutes = parseMinutes(draft.minutesText)
  const previewRows = useMemo(
    () =>
      journey.data === undefined || draft.fromSequence === null || minutes === null
        ? []
        : toDownstreamPreview(journey.data.stops, draft.fromSequence, minutes),
    [journey.data, draft.fromSequence, minutes],
  )

  const reviewedStop = stops.find((stop) => stop.sequence === reviewDraft?.fromSequence)
  const serviceName = journey.data?.serviceName ?? 'This journey'
  const summary =
    reviewDraft === null
      ? ''
      : `Delay of ${reviewDraft.minutes} minutes from ${reviewedStop?.label ?? `stop ${reviewDraft.fromSequence}`} on ${serviceName}.`

  function handleSubmit(input: DelayInput) {
    publish.reset()
    setReviewDraft(input)
    setIsDialogOpen(true)
  }

  async function handleConfirm() {
    if (reviewDraft === null) {
      return
    }

    try {
      const change = await publish.mutateAsync(reviewDraft)
      // Before navigate(): the blocker reads this flag in the same tick, before React re-renders.
      markSubmitted()
      navigate(`/journeys/${encodeURIComponent(journeyId)}/published/${encodeURIComponent(change.id)}`)
    } catch {
      // The failure is shown from publish.error inside the dialog, so the rejection only has to be stopped here.
    }
  }

  return (
    <>
      <PublishDrawer
        title="Publish a delay"
        serviceName={journey.data?.serviceName ?? null}
        lineName={journey.data?.lineName ?? null}
        onClose={close}
        actions={
          <>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" form={FORM_ID} disabled={!isValid || publish.isPending}>
              {publish.isPending ? 'Publishing…' : 'Review delay'}
            </Button>
          </>
        }
      >
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
            <>
              <DelayForm
                formId={FORM_ID}
                stops={stops}
                onSubmit={handleSubmit}
                onDirtyChange={handleDirtyChange}
                onValidityChange={handleValidityChange}
                onDraftChange={handleDraftChange}
              />

              <DelayPreview
                rows={previewRows}
                hasSelection={draft.fromSequence !== null && minutes !== null}
              />

              <ReachList title="This delay reaches" />
              <ProvenanceNote publisherName={publisher.displayName} />
            </>
          )}
        </QueryState>
      </PublishDrawer>

      <PublishConfirmDialog
        isOpen={isDialogOpen && reviewDraft !== null}
        title="Publish this delay?"
        summary={summary}
        publishedBy={publisher.displayName}
        confirmLabel="Confirm delay"
        cancelLabel="Go back"
        extra={<ReviewList title="This reaches:" items={REACH_AUDIENCES} />}
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
    </>
  )
}
