import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { sessionService, type SessionState } from '@/features/auth/api/session'
import { setUnauthorizedHandler } from '@/shared/api/authBridge'
import { AuthContext, type AuthContextValue, type CompletedSignInResult } from './AuthContext'

type AuthProviderProps = {
  children: ReactNode
}

const SIGNED_OUT: SessionState = { status: 'signed_out' }

// Identity is hand-rolled context rather than a query: it is session state for the whole app, not
// cached server data. logout also clears the query cache so one user's data never shows for the next.
function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<SessionState>(SIGNED_OUT)
  const [isLoading, setIsLoading] = useState(true)
  // The 401 handler runs outside React render, so it reads the latest state through a ref.
  const sessionRef = useRef<SessionState>(SIGNED_OUT)

  const applySession = useCallback((next: SessionState) => {
    sessionRef.current = next
    setSession(next)
  }, [])

  useEffect(() => {
    // The flag stops a response that arrives after unmount (StrictMode mounts twice) from writing state.
    let cancelled = false

    sessionService
      .getSession()
      // A failed session check means signed out, not a crashed app.
      .catch(() => SIGNED_OUT)
      .then((next) => {
        if (!cancelled) {
          sessionRef.current = next
          setSession(next)
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  // A signed-in request rejected with 401 means the token is no longer good. Clearing the local
  // session and returning to sign-in beats retrying every query against the API. The full reload is
  // deliberate: the provider sits above the router, so it cannot navigate, and it also drops any
  // cached view of the previous user.
  const handleUnauthorized = useCallback(() => {
    if (sessionRef.current.status === 'signed_out') {
      return
    }

    applySession(SIGNED_OUT)
    queryClient.clear()
    void sessionService.clearSession()
    window.location.assign('/login')
  }, [applySession, queryClient])

  useEffect(() => {
    setUnauthorizedHandler(handleUnauthorized)
    return () => setUnauthorizedHandler(null)
  }, [handleUnauthorized])

  const signIn = useCallback(async (returnTo?: string) => {
    await sessionService.signIn(returnTo)
  }, [])

  const completeSignIn = useCallback(async (): Promise<CompletedSignInResult> => {
    const completed = await sessionService.completeSignIn()
    applySession(completed.state)
    setIsLoading(false)
    return {
      returnTo: completed.returnTo,
      status: completed.state.status,
    }
  }, [applySession])

  const logout = useCallback(async () => {
    applySession(SIGNED_OUT)
    setIsLoading(false)
    queryClient.clear()
    await sessionService.logout()
  }, [applySession, queryClient])

  const currentUser = session.status === 'signed_in' ? session.user : null
  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      isSignedIn: session.status !== 'signed_out',
      isLoading,
      signIn,
      completeSignIn,
      logout,
    }),
    [currentUser, session.status, isLoading, signIn, completeSignIn, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
