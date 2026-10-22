import Badge from '@/shared/components/Badge'
import { formatRailwayTime } from '@/shared/lib/railwayTime'
import { DIRECTION_LABELS, JOURNEY_STATUS_LABELS, type Journey } from '../types'

type JourneyTableRowProps = {
  journey: Journey
}

// A pure row: it receives a journey and renders it. The status is always a text label beside the colour.
export default function JourneyTableRow({ journey }: JourneyTableRowProps) {
  return (
    <tr>
      <td>
        <time dateTime={journey.scheduledDepartureAt}>{formatRailwayTime(journey.scheduledDepartureAt)}</time>
      </td>
      <td>{journey.serviceName}</td>
      <td>
        {journey.lineCode} {journey.lineName}
      </td>
      <td>{DIRECTION_LABELS[journey.direction]}</td>
      <td>
        {journey.status === null ? (
          <Badge kind="status" value="unavailable" size="sm">
            Not reported
          </Badge>
        ) : (
          <Badge kind="status" value={journey.status} size="sm">
            {JOURNEY_STATUS_LABELS[journey.status]}
          </Badge>
        )}
      </td>
    </tr>
  )
}
