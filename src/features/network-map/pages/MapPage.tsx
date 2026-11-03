import { useJourneys } from '@/features/journeys/hooks/useJourneys'
import type { Journey } from '@/features/journeys/types'
import { useLines } from '@/features/stations/hooks/useLines'
import type { Line } from '@/features/stations/types'
import FreshnessNote from '@/shared/ui/FreshnessNote'
import QueryState from '@/shared/ui/QueryState'
import NetworkMap from '../components/NetworkMap'
import styles from './MapPage.module.css'

// The design names the two lines it drew; the page names whichever lines the network actually has, so a
// line added or renamed on the server appears here without a code change.
const lineList = new Intl.ListFormat('en', { type: 'conjunction', style: 'long' })

function subtitleFor(lines: readonly Line[] | undefined): string {
  if (lines === undefined || lines.length === 0) {
    return 'Schematic of the network with current train positions'
  }

  return `Schematic of ${lineList.format(lines.map((line) => `the ${line.name}`))} with current train positions`
}

// Controller-only (the route guard enforces it). Both reads feed one drawing, so the page has one
// loading state, one error state and one Refresh that refetches both.
export default function MapPage() {
  const linesQuery = useLines()
  const journeysQuery = useJourneys()

  // The newest of the two responses is the one that has moved the picture on.
  const updatedAt = Math.max(linesQuery.dataUpdatedAt, journeysQuery.dataUpdatedAt)
  const isFetching = linesQuery.isFetching || journeysQuery.isFetching

  function refresh() {
    void linesQuery.refetch()
    void journeysQuery.refetch()
  }

  return (
    <section className={styles.page} aria-labelledby="network-map-title">
      <header className={styles.header}>
        <div>
          <h1 id="network-map-title" className={styles.title}>
            Network map
          </h1>
          <p className={styles.subtitle}>{subtitleFor(linesQuery.data)}</p>
        </div>

        <FreshnessNote updatedAt={updatedAt} isFetching={isFetching} onRefresh={refresh} />
      </header>

      <QueryState<Line[]>
        isPending={linesQuery.isPending}
        isError={linesQuery.isError && linesQuery.data === undefined}
        error={linesQuery.error}
        data={linesQuery.data}
        onRetry={() => void linesQuery.refetch()}
        isEmpty={(lines) => lines.length === 0}
        emptyTitle="No lines in the network"
        emptyDescription="The map draws the lines the network holds, and there are none to draw."
      >
        {(lines) => (
          <QueryState<Journey[]>
            isPending={journeysQuery.isPending}
            isError={journeysQuery.isError && journeysQuery.data === undefined}
            error={journeysQuery.error}
            data={journeysQuery.data}
            onRetry={() => void journeysQuery.refetch()}
            // An empty operations feed still draws the network; "No trains are running" sits under it.
            isEmpty={() => false}
            emptyTitle="No trains are running"
          >
            {(journeys) => <NetworkMap lines={lines} journeys={journeys} />}
          </QueryState>
        )}
      </QueryState>
    </section>
  )
}
