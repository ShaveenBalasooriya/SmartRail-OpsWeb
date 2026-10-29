import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { useCurrentUser } from '@/app/providers/AuthContext'
import { useJourney } from '@/features/journeys/hooks/useJourney'
import { toPlatformNumbers } from '@/features/journeys/lib/journeyStops'
import type { JourneyDetail } from '@/features/journeys/types'
import { useStations } from '@/features/stations/hooks/useStations'
import { formatRailwayTime } from '@/shared/lib/railwayTime'
import Button from '@/shared/components/Button'
import EmptyState from '@/shared/ui/EmptyState'
import QueryState from '@/shared/ui/QueryState'
import ProvenanceNote from '../components/ProvenanceNote'
import PublishConfirmDialog from '../components/PublishConfirmDialog'
import PublishDrawer from '../components/PublishDrawer'
import { ReachItems } from '../components/ReachList'
import ReviewList from '../components/ReviewList'
import { usePublishCorrection } from '../hooks/usePublishCorrection'
import { REACH_AUDIENCES } from '../lib/audiences'
import { toChangeViews } from '../lib/changeHistory'
import { publishErrorMessage } from '../lib/publishErrorMessage'
import { publishedValueRows, platformNumbersOfStations, stopLabelsOf } from '../lib/publishedValues'
import styles from '../components/PublishDrawer.module.css'

// The correction drawer. It can only withdraw a change: the API's correction endpoint takes no body and no
// values, so the design's "what is now true" input has no endpoint behind it. The published values are
// shown against the fact of the withdrawal, and the drawer says why.
export default function PublishCorrectionPage() {
  const { journeyId = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const publisher = useCurrentUser()
  const journey = useJourney(journeyId)
  const stations = useStations()
  const correction = usePublishCorrection()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const stationNumbers = useMemo(
    () => platformNumbersOfStations(stations.data ?? []),
    [stations.data],
  )

  // The same rule the history uses: a change the server would still accept a correction for, never a
  // correction itself and never one that already has a correction.
  const correctable = useMemo(
    () =>
      journey.data === undefined
        ? []
        : toChangeViews(
            journey.data.changes,
            new Map([...stationNumbers, ...toPlatformNumbers(journey.data.stops)]),
            journey.data.status,
          ).filter((view) => view.isCorrectable),
    [journey.data, stationNumbers],
  )

  // ?changeId= is the history's deep link into this drawer. It only preselects a change that is offered, so a
  // stale or tampered id cannot select an uncorrectable one.
  const urlChangeId = searchParams.get('changeId')
  const fromUrl =
    urlChangeId !== null && correctable.some((view) => view.id === urlChangeId) ? urlChangeId : null
  const effectiveId = selectedId ?? fromUrl
  const selectedView = correctable.find((view) => view.id === effectiveId) ?? null
  const selectedChange = journey.data?.changes.find((change) => change.id === effectiveId) ?? null

  const stopLabels = journey.data === undefined ? new Map<number, string>() : stopLabelsOf(journey.data.stops)
  const platformNumbers =
    journey.data === undefined
      ? stationNumbers
      : new Map([...stationNumbers, ...toPlatformNumbers(journey.data.stops)])
  const valueRows =
    selectedChange === null ? [] : publishedValueRows(selectedChange, stopLabels, platformNumbers)

  const serviceName = journey.data?.serviceName ?? 'This journey'
  const summary =
    selectedView === null
      ? ''
      : `Corrects the ${selectedView.typeLabel.toLowerCase()} published at ${formatRailwayTime(selectedView.publishedAt)} on ${serviceName}: the change is withdrawn.`

  function handleClose() {
    navigate(`/journeys/${encodeURIComponent(journeyId)}`)
  }

  function handleSelect(changeId: string) {
    setSelectedId(changeId)
    setSearchParams({ changeId }, { replace: true })
  }

  function handleReview() {
    if (selectedView === null) {
      return
    }

    correction.reset()
    setIsDialogOpen(true)
  }

  async function handleConfirm() {
    if (selectedView === null) {
      return
    }

    try {
      const change = await correction.mutateAsync(selectedView.id)
      navigate(`/journeys/${encodeURIComponent(journeyId)}/published/${encodeURIComponent(change.id)}`)
    } catch {
      // The failure is shown from correction.error inside the dialog, so the rejection only has to stop here.
    }
  }

  return (
    <>
      <PublishDrawer
        title="Correct a change"
        serviceName={journey.data?.serviceName ?? null}
        lineName={journey.data?.lineName ?? null}
        onClose={handleClose}
        actions={
          <>
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleReview} disabled={selectedView === null || correction.isPending}>
              {correction.isPending ? 'Publishing…' : 'Review correction'}
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
          {() =>
            correctable.length === 0 ? (
              <EmptyState
                title="No changes can be corrected"
                description="A change that already has a correction, a correction itself, and every change on a completed journey cannot be corrected."
              />
            ) : (
              <>
                <fieldset className={styles.options}>
                  <legend className={styles.stepTitle}>1. Choose the change to correct</legend>
                  {correctable.map((view) => {
                    const isSelected = view.id === effectiveId
                    return (
                      <label
                        key={view.id}
                        htmlFor={`correct-${view.id}`}
                        className={`${styles.option} ${isSelected ? styles.optionSelected : ''}`}
                      >
                        <input
                          id={`correct-${view.id}`}
                          type="radio"
                          name="correct-change"
                          value={view.id}
                          checked={isSelected}
                          onChange={() => handleSelect(view.id)}
                          className={styles.optionInput}
                        />
                        <span className={styles.optionBody}>
                          <span className={styles.optionTitle}>{view.typeLabel}</span>
                          <span>{view.summary}</span>
                          <span className={styles.optionMeta}>
                            <span className={styles.tag}>{view.provenanceLabel}</span>
                            <span>{view.publisher}</span>
                            <span aria-hidden="true">·</span>
                            <time dateTime={view.publishedAt}>{formatRailwayTime(view.publishedAt)}</time>
                          </span>
                        </span>
                      </label>
                    )
                  })}
                </fieldset>

                <section className={styles.section} aria-labelledby="correction-compare-title">
                  <h3 id="correction-compare-title" className={styles.sectionTitle}>
                    2. What was published against what is now true
                  </h3>

                  {selectedView === null || selectedChange === null ? (
                    <p className={styles.hint}>Choose a change to compare what was published with what is now true.</p>
                  ) : (
                    <>
                      <p className={styles.devNote}>
                        The correction endpoint takes no values, so a correction withdraws the original change as a
                        whole. The design&apos;s &ldquo;minutes now true&rdquo; input is not built: there is no
                        request field for a partial correction.
                      </p>
                      <div className={styles.compare}>
                        <div className={styles.column}>
                          <h4 className={styles.columnTitle}>Published</h4>
                          <p className={styles.hint}>
                            {`${selectedView.typeLabel} at ${formatRailwayTime(selectedView.publishedAt)}, ${selectedView.provenanceLabel}`}
                          </p>
                          <dl className={styles.rows}>
                            {valueRows.map((row) => (
                              <div key={row.label} className={styles.row}>
                                <dt className={styles.rowLabel}>{row.label}</dt>
                                <dd className={styles.rowValue}>{row.value}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                        <div className={`${styles.column} ${styles.columnNow}`}>
                          <h4 className={styles.columnTitle}>Now true</h4>
                          <p className={styles.hint}>Correction to be published</p>
                          <dl className={styles.rows}>
                            <div className={styles.row}>
                              <dt className={styles.rowLabel}>This change</dt>
                              <dd className={styles.rowValue}>
                                <span className={styles.change}>Withdrawn</span>
                              </dd>
                            </div>
                          </dl>
                          <p className={styles.hint}>
                            The journey returns to the state it would have had without this change.
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </section>

                <section className={styles.section} aria-labelledby="correction-confirm-title">
                  <h3 id="correction-confirm-title" className={styles.sectionTitle}>
                    3. Confirm
                  </h3>
                  <p className={styles.hint}>
                    The correction is linked to the original, and both stay in the change history. It is published
                    immediately to every channel:
                  </p>
                  <ReachItems />
                  <ProvenanceNote publisherName={publisher.displayName} />
                </section>
              </>
            )
          }
        </QueryState>
      </PublishDrawer>

      <PublishConfirmDialog
        isOpen={isDialogOpen && selectedView !== null}
        title="Publish this correction?"
        summary={summary}
        publishedBy={publisher.displayName}
        confirmLabel="Confirm correction"
        cancelLabel="Go back"
        extra={<ReviewList title="This reaches:" items={REACH_AUDIENCES} />}
        isConfirming={correction.isPending}
        error={correction.error ? publishErrorMessage(correction.error) : null}
        onConfirm={() => void handleConfirm()}
        onCancel={() => setIsDialogOpen(false)}
      />
    </>
  )
}
