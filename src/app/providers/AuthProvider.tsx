import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { sessionService } from '@/features/auth/api/session'
import type { Role, User } from '@/features/auth/types'
import { AuthContext, type AuthContextValue } from './AuthContext'

type AuthProviderProps = {
  children: ReactNode
}

// Identity is hand-rolled context rather than a query: it is session state for the whole app, not
// cached server data. logout also clears the query cache so one user's data never shows for the next.
function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // The flag stops a response that arrives after unmount (StrictMode mounts twice) from writing state.
    let cancelled = false

    sessionService
      .getCurrentUser()
      // A failed session check means signed out, not a crashed app.
      .catch(() => null)
      .then((user) => {
        if (!cancelled) {
          setCurrentUser(user)
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  // Returns the user so the caller can route on the role straight away, without waiting for a re-render.
  const login = useCallback(async (role: Role) => {
    const user = await sessionService.login(role)
    setCurrentUser(user)
    return user
  }, [])

  const logout = useCallback(async () => {
    try {
      await sessionService.logout()
    } finally {
      setCurrentUser(null)
      queryClient.clear()
    }
  }, [queryClient])

  const value = useMemo<AuthContextValue>(
    () => ({ currentUser, isLoading, login, logout }),
    [currentUser, isLoading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
