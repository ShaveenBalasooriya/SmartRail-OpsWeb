import { Link } from 'react-router'
import type { JourneyStatus } from '@/features/journeys/types'
import styles from './PublishActions.module.css'

type PublishActionsProps = {
  journeyId: string
  // null means the timetable did not report a status. Every action is offered then, and the server decides.
  status: JourneyStatus | null
  canPublish: boolean
}

type PublishAction = {
  path: 'delay' | 'cancellation' | 'platform-change' | 'termination'
  label: string
  isAllowed: (status: JourneyStatus | null) => boolean
}

// A delay or platform change is accepted only for a journey that is still open: scheduled or running.
function isOpenForChange(status: JourneyStatus | null): boolean {
  return status === null || status === 'scheduled' || status === 'running'
}

// The spec's status matrix. Each action is offered only where the server would accept it:
// - a cancellation is refused once a journey has departed, so it is offered only before departure. A running
//   journey has departed, so it is never offered one;
// - an early termination ends a journey that is running, so a scheduled journey is offered none (cancel it
//   instead);
// - a cancelled, terminated or completed journey is closed to every change.
// A null status (not reported) offers every action, and the server decides.
const ACTIONS: PublishAction[] = [
  { path: 'delay', label: 'Publish a delay', isAllowed: isOpenForChange },
  {
    path: 'cancellation',
    label: 'Cancel journey',
    isAllowed: (status) => status === null || status === 'scheduled',
  },
  { path: 'platform-change', label: 'Change a platform', isAllowed: isOpenForChange },
  {
    path: 'termination',
    label: 'Early termination',
    isAllowed: (status) => status === null || status === 'running',
  },
]

// Hidden rather than disabled for an auditor: an action they cannot take is not offered at all.
export default function PublishActions({ journeyId, status, canPublish }: PublishActionsProps) {
  if (!canPublish) {
    return null
  }

  const actions = ACTIONS.filter((action) => action.isAllowed(status))
  if (actions.length === 0) {
    return null
  }

  return (
    <section aria-labelledby="publish-actions-title" className={styles.section}>
      <h2 id="publish-actions-title" className={styles.title}>
        Publish a change
      </h2>
      <ul className={styles.list}>
        {actions.map((action) => (
          <li key={action.path}>
            <Link
              to={`/journeys/${encodeURIComponent(journeyId)}/publish/${action.path}`}
              className={styles.action}
            >
              {action.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
