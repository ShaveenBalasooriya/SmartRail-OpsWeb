import Badge from '@/shared/components/Badge'
import { JOURNEY_STATUS_LABELS, type JourneyStatus } from '../types'

type JourneyStatusBadgeProps = {
  // The operations feed always reports a status, so there is no "not reported" case any more.
  status: JourneyStatus
}

// Shared by the board and the detail page. The label is text, so the status is never colour alone.
export default function JourneyStatusBadge({ status }: JourneyStatusBadgeProps) {
  return (
    <Badge kind="status" value={status} size="sm">
      {JOURNEY_STATUS_LABELS[status]}
    </Badge>
  )
}
