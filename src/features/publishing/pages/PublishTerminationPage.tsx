import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useCurrentUser } from '@/app/providers/AuthContext'
import { useJourney } from '@/features/journeys/hooks/useJourney'
import type { JourneyDetail } from '@/features/journeys/types'
import { useStations } from '@/features/stations/hooks/useStations'
import { indexStations } from '@/features/stations/lib/stationLookup'
import { formatRailwayTime } from '@/shared/lib/railwayTime'
import Button from '@/shared/components/Button'
import { useBlockUnsavedChanges } from '@/shared/hooks/useBlockUnsavedChanges'
import QueryState from '@/shared/ui/QueryState'
import ProvenanceNote from '../components/ProvenanceNote'
import PublishConfirmDialog from '../components/PublishConfirmDialog'
import PublishDrawer from '../components/PublishDrawer'
import ReachList from '../components/ReachList'
import ReviewList from '../components/ReviewList'
import TerminationForm from '../components/TerminationForm'
import UnsavedChangesDialog from '../components/UnsavedChangesDialog'
import { usePublishTermination } from '../hooks/usePublishTermination'
import { REACH_AUDIENCES } from '../lib/audiences'
import { publishErrorMessage } from '../lib/publishErrorMessage'
import { toTerminationStopOptions } from '../lib/stopOptions'
import { stopsNoLongerServed } from '../lib/terminationPreview'
import type { TerminationInput } from '../types'
import styles from './PublishTerminationPage.module.css'

const FORM_ID = 'publish-termination-form'

// The early-termination drawer. The same flow as the delay drawer: the form holds a draft, the review dialog
// confirms it, and a failure keeps the draft with the dialog's message. The termination is irreversible for
// the train's journey, so the review button is the danger variant.
export default function PublishTerminationPage() {
  const { journeyId = '' } = useParams()
  const navigate = useNavigate()
  const publisher = useCurrentUser()
  const journey = useJourney(journeyId)
  const stations = useStations()
  const stationIndex = useMemo(() => indexStations(stations.data ?? []), [stations.data])
  // The final calling stop and every stop the train has already left are not candidates.
  const stops = useMemo(
    () => (journey.data ? toTerminationStopOptions(journey.data.stops, stationIndex) : []),
    [journey.data, stationIndex],
  )
  const publish = usePublishTermination(journeyId)

  const [isDirty, setIsDirty] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const [draftStopSequence, setDraftStopSequence] = useState<number | null>(null)
  const { blocker, markSubmitted } = useBlockUnsavedChanges(isDirty)
  const [reviewDraft, setReviewDraft] = useState<TerminationInput | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const close = useCallback(() => {
    navigate(`/journeys/${encodeURIComponent(journeyId)}`)
  }, [journeyId, navigate])

  const handleDirtyChange = useCallback((value: boolean) => setIsDirty(value), [])
  const handleValidityChange = useCallback((value: boolean) => setIsValid(value), [])
  const handleDraftChange = useCallback((value: number | null) => setDraftStopSequence(value), [])

  const notServedRows = useMemo(
    () =>
      journey.data === undefined || draftStopSequence === null
        ? []
        : stopsNoLongerServed(journey.data.stops, draftStopSequence),
    [journey.data, draftStopSequence],
  )

  const reviewedStop = stops.find((stop) => stop.sequence === reviewDraft?.lastStopSequence)
  const serviceName = journey.data?.serviceName ?? 'This journey'
  const summary =
    reviewDraft === null
      ? ''
      : `${serviceName} will end its journey at ${reviewedStop?.label ?? `stop ${reviewDraft.lastStopSequence}`}.`

  function handleSubmit(input: TerminationInput) {
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
      markSubmitted()
      navigate(`/journeys/${encodeURIComponent(journeyId)}/published/${encodeURIComponent(change.id)}`)
    } catch {
      // The failure is shown from publish.error inside the dialog, so the rejection only has to be stopped here.
    }
  }

  return (
    <>
      <PublishDrawer
        title="Early termination"
        serviceName={journey.data?.serviceName ?? null}
        lineName={journey.data?.lineName ?? null}
        onClose={close}
        actions={
          <>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" form={FORM_ID} disabled={!isValid || publish.isPending}>
              {publish.isPending ? 'Publishing…' : 'Review termination'}
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
              <TerminationForm
                formId={FORM_ID}
                stops={stops}
                onSubmit={handleSubmit}
                onDirtyChange={handleDirtyChange}
                onValidityChange={handleValidityChange}
                onDraftChange={handleDraftChange}
              />

              <section className={styles.section} aria-labelledby="not-served-title">
                <h3 id="not-served-title" className={styles.sectionTitle}>
                  Stops no longer served
                </h3>
                {draftStopSequence === null ? (
                  <p className={styles.hint}>Choose the last stop served to see which stops are no longer served.</p>
                ) : notServedRows.length === 0 ? (
                  <p className={styles.hint}>No later calling stops are on record.</p>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <caption className={styles.caption}>
                        Stops after the last stop served. The change is published to every channel at once.
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Stop</th>
                          <th scope="col">Scheduled</th>
                          <th scope="col">Becomes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {notServedRows.map((row) => (
                          <tr key={row.sequence}>
                            <td>{row.stopLabel}</td>
                            <td>
                              {row.scheduled === null ? (
                                '—'
                              ) : (
                                <time dateTime={row.scheduled}>{formatRailwayTime(row.scheduled)}</time>
                              )}
                            </td>
                            <td>Not served</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <ReachList title="This termination reaches" />
              <ProvenanceNote publisherName={publisher.displayName} />
            </>
          )}
        </QueryState>
      </PublishDrawer>

      <PublishConfirmDialog
        isOpen={isDialogOpen && reviewDraft !== null}
        title="Publish this early termination?"
        summary={summary}
        publishedBy={publisher.displayName}
        confirmLabel="Confirm early termination"
        cancelLabel="Go back"
        confirmVariant="danger"
        extra={
          <>
            <ReviewList
              title="No longer served:"
              items={notServedRows.map((row) => row.stopLabel)}
            />
            <ReviewList title="This reaches:" items={REACH_AUDIENCES} />
          </>
        }
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
