import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '@/app/providers/AuthContext'
import ErrorPage from '@/shared/ui/ErrorPage'
import LoadingIndicator from '@/shared/ui/LoadingIndicator'

// Authentik redirects here with the authorization code. The exchange must run once: the OIDC state
// is consumed by the first call, and StrictMode mounts effects twice in development.
export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const { completeSignIn } = useAuth()
  const hasStarted = useRef(false)
  const [hasFailed, setHasFailed] = useState(false)

  useEffect(() => {
    if (hasStarted.current) {
      return
    }
    hasStarted.current = true

    // No cleanup flag: StrictMode runs the cleanup after the first setup, and the second setup
    // returns at the guard above, so cancelling here would discard the only exchange. A late result
    // after a real unmount is a harmless no-op in React 18+.
    completeSignIn()
      .then((result) => {
        // A rejected token (401 from /me) is signed out, not "no access": send them back to sign in.
        if (result.status === 'signed_in') {
          navigate(result.returnTo, { replace: true })
        } else {
          navigate(result.status === 'no_access' ? '/no-access' : '/login', { replace: true })
        }
      })
      .catch(() => {
        setHasFailed(true)
      })
  }, [completeSignIn, navigate])

  if (hasFailed) {
    return (
      <ErrorPage
        title="Sign-in did not complete"
        message="The response from Authentik could not be verified. Start again from the sign-in page."
        actions={<Link to="/login">Back to sign in</Link>}
      />
    )
  }

  return <LoadingIndicator label="Completing sign-in…" />
}
