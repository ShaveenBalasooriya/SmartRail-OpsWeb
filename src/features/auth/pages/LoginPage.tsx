import { useState } from 'react'
import { useLocation } from 'react-router'
import { useAuth } from '@/app/providers/AuthContext'
import Button from '@/shared/components/Button'
import styles from './LoginPage.module.css'

// The return path arrives in router state from the unauthorized page, so it is untrusted. Only an
// internal path is accepted; `//host` would be treated as another origin by the browser. The default is
// the role landing page, so an auditor is not sent to a board the API refuses them.
function returnPathFrom(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'from' in state) {
    const from = (state as { from?: unknown }).from
    if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')) {
      return from
    }
  }

  return '/'
}

export default function LoginPage() {
  const location = useLocation()
  const { signIn } = useAuth()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [hasFailed, setHasFailed] = useState(false)

  // signIn redirects the whole window, so this only settles again if the redirect could not start.
  async function handleSignIn() {
    setHasFailed(false)
    setIsSigningIn(true)

    try {
      await signIn(returnPathFrom(location.state))
    } catch {
      setIsSigningIn(false)
      setHasFailed(true)
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.note}>
          Use your SmartRail staff account. You will be sent to Authentik to sign in.
        </p>
        {hasFailed && (
          <p role="alert" className={styles.error}>
            Sign-in could not start. Please try again.
          </p>
        )}
        <Button className={styles.submit} onClick={() => void handleSignIn()} disabled={isSigningIn}>
          {isSigningIn ? 'Redirecting to Authentik…' : 'Sign in with Authentik'}
        </Button>
      </div>
    </main>
  )
}
