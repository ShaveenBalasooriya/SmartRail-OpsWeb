import Badge from '@/shared/components/Badge'
import { JOURNEY_STATUS_LABELS, type JourneyStatus } from '../types'

type JourneyStatusBadgeProps = {
  // null means the timetable reported no live status. It says so rather than guessing a status.
  status: JourneyStatus | null
}

// Shared by the board and the detail page. The label is text, so the status is never colour alone.
export default function JourneyStatusBadge({ status }: JourneyStatusBadgeProps) {
  if (status === null) {
    return (
      <Badge kind="status" value="unavailable" size="sm">
        Not reported
      </Badge>
    )
  }

  return (
    <Badge kind="status" value={status} size="sm">
      {JOURNEY_STATUS_LABELS[status]}
    </Badge>
  )
}
