import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useCurrentUser } from '@/app/providers/AuthContext'
import { useJourney } from '@/features/journeys/hooks/useJourney'
import type { JourneyDetail } from '@/features/journeys/types'
import { useStations } from '@/features/stations/hooks/useStations'
import { indexStations, platformNumber } from '@/features/stations/lib/stationLookup'
import Button from '@/shared/components/Button'
import { useBlockUnsavedChanges } from '@/shared/hooks/useBlockUnsavedChanges'
import QueryState from '@/shared/ui/QueryState'
import PlatformChangeForm from '../components/PlatformChangeForm'
import ProvenanceNote from '../components/ProvenanceNote'
import PublishConfirmDialog from '../components/PublishConfirmDialog'
import PublishDrawer from '../components/PublishDrawer'
import ReachList from '../components/ReachList'
import ReviewList from '../components/ReviewList'
import UnsavedChangesDialog from '../components/UnsavedChangesDialog'
import { usePublishPlatformChange } from '../hooks/usePublishPlatformChange'
import { REACH_AUDIENCES } from '../lib/audiences'
import { publishErrorMessage } from '../lib/publishErrorMessage'
import { toStopOptions } from '../lib/stopOptions'
import type { PlatformChangeInput } from '../types'
import styles from './PublishPlatformChangePage.module.css'

const FORM_ID = 'publish-platform-form'

// The platform drawer. The form holds a draft until the review dialog confirms it, as in the delay drawer.
export default function PublishPlatformChangePage() {
  const { journeyId = '' } = useParams()
  const navigate = useNavigate()
  const publisher = useCurrentUser()
  const journey = useJourney(journeyId)
  const stations = useStations()
  const stationIndex = useMemo(() => indexStations(stations.data ?? []), [stations.data])
  const stops = useMemo(
    () => (journey.data ? toStopOptions(journey.data.stops, stationIndex) : []),
    [journey.data, stationIndex],
  )
  const publish = usePublishPlatformChange(journeyId)

  const [isDirty, setIsDirty] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const { blocker, markSubmitted } = useBlockUnsavedChanges(isDirty)
  const [draft, setDraft] = useState<PlatformChangeInput | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const close = useCallback(() => {
    navigate(`/journeys/${encodeURIComponent(journeyId)}`)
  }, [journeyId, navigate])

  const handleDirtyChange = useCallback((value: boolean) => setIsDirty(value), [])
  const handleValidityChange = useCallback((value: boolean) => setIsValid(value), [])

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
      // Before navigate(), for the same reason as in the delay drawer.
      markSubmitted()
      navigate(`/journeys/${encodeURIComponent(journeyId)}/published/${encodeURIComponent(change.id)}`)
    } catch {
      // The failure is shown from publish.error inside the dialog, so the rejection only has to be stopped here.
    }
  }

  const draftStop = stops.find((stop) => stop.sequence === draft?.sequence)
  const fromNumber = draftStop?.platformId ? platformNumber(stationIndex, draftStop.platformId) : null
  const toNumber = draft ? platformNumber(stationIndex, draft.platformId) : null
  const serviceName = journey.data?.serviceName ?? 'This journey'
  const summary =
    draft === null
      ? ''
      : `${draftStop?.label ?? `Stop ${draft.sequence}`} moves from platform ${fromNumber ?? 'not set'} to platform ${toNumber ?? 'unknown'} on ${serviceName}.`

  return (
    <>
      <PublishDrawer
        title="Change a platform"
        serviceName={journey.data?.serviceName ?? null}
        lineName={journey.data?.lineName ?? null}
        onClose={close}
        actions={
          <>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" form={FORM_ID} disabled={!isValid || publish.isPending}>
              {publish.isPending ? 'Publishing…' : 'Review platform change'}
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
              <PlatformChangeForm
                formId={FORM_ID}
                stops={stops}
                stationIndex={stationIndex}
                onSubmit={handleSubmit}
                onDirtyChange={handleDirtyChange}
                onValidityChange={handleValidityChange}
              />

              <ReachList title="This change reaches" />
              <ProvenanceNote publisherName={publisher.displayName} />
            </>
          )}
        </QueryState>
      </PublishDrawer>

      <PublishConfirmDialog
        isOpen={isDialogOpen && draft !== null}
        title="Publish this platform change?"
        summary={summary}
        publishedBy={publisher.displayName}
        confirmLabel="Confirm platform change"
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
