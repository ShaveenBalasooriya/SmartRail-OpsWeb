import { Link } from 'react-router'
import { formatRailwayTime } from '@/shared/lib/railwayTime'
import { DIRECTION_LABELS, type Journey } from '../types'
import JourneyStatusBadge from './JourneyStatusBadge'

type JourneyTableRowProps = {
  journey: Journey
  // The railway day the board is showing. The detail page needs it to find the journey.
  serviceDate: string
}

// A pure row: it receives a journey and renders it. The service name is a real link, so keyboard and
// screen-reader users reach the detail page the same way as everyone else.
export default function JourneyTableRow({ journey, serviceDate }: JourneyTableRowProps) {
  return (
    <tr>
      <td>
        <time dateTime={journey.scheduledDepartureAt}>{formatRailwayTime(journey.scheduledDepartureAt)}</time>
      </td>
      <td>
        <Link to={`/journeys/${encodeURIComponent(journey.id)}?date=${encodeURIComponent(serviceDate)}`}>
          {journey.serviceName}
        </Link>
      </td>
      <td>
        {journey.lineCode} {journey.lineName}
      </td>
      <td>{DIRECTION_LABELS[journey.direction]}</td>
      <td>
        <JourneyStatusBadge status={journey.status} />
      </td>
    </tr>
  )
}
