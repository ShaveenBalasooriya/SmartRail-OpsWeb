import { useId, useMemo } from 'react'
import type { Journey } from '@/features/journeys/types'
import type { Line } from '@/features/stations/types'
import { layoutMap } from '../lib/layoutMap'
import { describeMap, placeTrains, type MapTrain, type TrainCard } from '../lib/placeTrains'
import MapLegend from './MapLegend'
import MapTrainTable from './MapTrainTable'
import styles from './NetworkMap.module.css'

type NetworkMapProps = {
  lines: readonly Line[]
  journeys: readonly Journey[]
}

type PlacedTrain = MapTrain & { anchor: NonNullable<MapTrain['anchor']>; card: TrainCard }

// The design's whole map: the generated schematic, its legend and the table that is its text
// equivalent. It draws from whatever the network and the operations feed hold, so two lines, five
// lines or none all take the same path through this component.
export default function NetworkMap({ lines, journeys }: NetworkMapProps) {
  const markerId = `map-arrow-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const { layout, trains, ariaLabel } = useMemo(() => {
    const computedLayout = layoutMap(lines)
    const placed = placeTrains(journeys, computedLayout)
    return { layout: computedLayout, trains: placed, ariaLabel: describeMap(placed) }
  }, [lines, journeys])

  const placedTrains = trains.filter(
    (train): train is PlacedTrain => train.anchor !== null && train.card !== null,
  )

  return (
    <div className={styles.map}>
      <div className={styles.mapCard}>
        <svg
          className={styles.svg}
          viewBox={layout.viewBox}
          role="img"
          aria-label={ariaLabel}
        >
          <defs>
            <marker id={markerId} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M0 0 L8 4 L0 8 z" className={styles.arrowHead} />
            </marker>
          </defs>

          {layout.lines.map((line) => (
            <g key={line.id}>
              <text
                className={styles.lineName}
                x={line.label.x}
                y={line.label.y}
                style={{ fill: line.colour }}
              >
                {line.name}
              </text>
              <path
                d={line.path}
                fill="none"
                strokeWidth={6}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ stroke: line.colour }}
              />
            </g>
          ))}

          <g className={styles.stations}>
            {layout.lines.flatMap((line) =>
              line.stations.map((station) => (
                <circle
                  key={`${line.id}-${station.stationId}`}
                  cx={station.x}
                  cy={station.y}
                  r={layout.stationRadius}
                />
              )),
            )}
          </g>

          <g>
            {layout.lines.flatMap((line) =>
              line.stations.map((station) => (
                <text
                  key={`${line.id}-${station.stationId}`}
                  className={styles.stationSub}
                  x={station.x}
                  y={station.labelSide === 'above' ? station.y - 22 : station.y + 32}
                  textAnchor="middle"
                >
                  {station.name}
                </text>
              )),
            )}
            {layout.hubs.map((hub) => (
              <g key={hub.stationId}>
                <circle className={styles.hub} cx={hub.x} cy={hub.y} r={layout.interchangeRadius} />
                <circle className={styles.hubCore} cx={hub.x} cy={hub.y} r={6} />
                <text className={styles.stationText} x={hub.label.x} y={hub.label.y}>
                  {hub.name}
                </text>
                <text className={styles.stationSub} x={hub.label.x} y={hub.label.y + 18}>
                  Interchange
                </text>
              </g>
            ))}
          </g>

          {placedTrains.map((train) => (
            <TrainOnMap key={train.journey.id} train={train} />
          ))}

          <g className={styles.outbound}>
            <path
              d={`M ${layout.outbound.from.x} ${layout.outbound.from.y} L ${layout.outbound.to.x} ${layout.outbound.to.y}`}
              strokeWidth={2}
              markerEnd={`url(#${markerId})`}
            />
            <text x={layout.outbound.label.x} y={layout.outbound.label.y}>
              Outbound
            </text>
          </g>
        </svg>
      </div>

      <MapLegend lines={layout.lines} />

      {trains.length === 0 ? (
        <p className={styles.noTrains}>No trains are running.</p>
      ) : (
        <MapTrainTable trains={trains} />
      )}
    </div>
  )
}

function TrainOnMap({ train }: { train: PlacedTrain }) {
  const { card, anchor } = train
  const isStale = train.journey.isStale
  const isTerminated = train.journey.status === 'terminated'
  const cardClass = isStale
    ? styles.cardStale
    : isTerminated
      ? styles.cardTerminated
      : styles.cardRunning
  const nameClass = isStale
    ? styles.nameStale
    : isTerminated
      ? styles.nameTerminated
      : styles.nameRunning
  const lineClass = isStale
    ? styles.textStale
    : isTerminated
      ? styles.textTerminated
      : styles.textRunning

  return (
    <g>
      <rect
        className={`${styles.card} ${cardClass}`}
        x={card.x}
        y={card.y}
        width={card.width}
        height={card.height}
        rx={8}
      />
      <path
        className={`${styles.stem} ${isStale ? styles.stemStale : isTerminated ? styles.stemTerminated : styles.stemRunning}`}
        d={`M ${card.stemX} ${card.stemFromY} L ${card.stemX} ${card.stemToY}`}
        strokeDasharray={isStale ? '4 3' : undefined}
      />
      {isTerminated ? (
        <rect
          className={`${styles.endMarker} ${lineClass}`}
          x={anchor.x - 7}
          y={anchor.y - 7}
          width={14}
          height={14}
          rx={2}
        />
      ) : (
        <circle
          className={`${styles.trainMarker} ${isStale ? styles.markerStale : styles.markerRunning}`}
          cx={anchor.x}
          cy={anchor.y}
          r={8}
        />
      )}
      <text className={`${styles.cardName} ${nameClass}`} x={card.x + 12} y={card.y + 20}>
        {train.serviceName}
      </text>
      <text className={`${styles.cardStatus} ${lineClass}`} x={card.x + 12} y={card.y + 38}>
        {train.statusText}
      </text>
      {train.staleText !== null && (
        <text className={`${styles.cardStatus} ${styles.textStale}`} x={card.x + 12} y={card.y + 56}>
          {train.staleText}
        </text>
      )}
    </g>
  )
}
