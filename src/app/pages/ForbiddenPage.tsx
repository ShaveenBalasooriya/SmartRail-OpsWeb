import { Link, useLocation } from 'react-router'
import { useAuth } from '@/app/providers/AuthContext'
import ErrorPage from '@/shared/ui/ErrorPage'

// The full-page 403 from the design. The role decides the wording and the action: an auditor who tried
// to publish sees the read-only explanation and the way to the audit log, while a controller who
// reached an auditor-only route gets the way back to the board.
export default function ForbiddenPage() {
  const { currentUser } = useAuth()
  const { pathname } = useLocation()
  const isAuditor = currentUser?.role === 'auditor'
  const isController = currentUser?.role === 'network_controller'
  const isPublishAttempt = pathname.includes('/publish/')

  return (
    <ErrorPage
      code="403"
      alert
      title="You don't have access to this page"
      message={
        <>
          {isAuditor && isPublishAttempt && (
            <p>
              Publishing, cancelling and correcting changes are available to the Network Controller role. You are
              signed in as Auditor, which is read-only.
            </p>
          )}
          {isAuditor && !isPublishAttempt && (
            <p>This page is available to another role. You are signed in as Auditor, which is read-only.</p>
          )}
          {isController && (
            <p>
              Audit and read-only views are available to the Auditor role. You are signed in as Network Controller,
              which can publish changes.
            </p>
          )}
          {!isAuditor && !isController && <p>Your role does not allow this page.</p>}
        </>
      }
      actions={
        // The design puts the board first, but the API refuses the operations reads to an auditor, so
        // for them the only route that goes anywhere is the audit log.
        isAuditor ? (
          <Link to="/audit">View audit log</Link>
        ) : (
          <Link to="/board">Back to the live board</Link>
        )
      }
    />
  )
}
