import { createContext, useContext } from 'react'
import type { SessionState } from '@/features/auth/api/session'
import type { User } from '@/features/auth/types'

export type CompletedSignInResult = {
  returnTo: string
  status: SessionState['status']
}

export type AuthContextValue = {
  currentUser: User | null
  // True for a guard too: the person signed in, but currentUser is null because the role has no access.
  isSignedIn: boolean
  isLoading: boolean
  signIn: (returnTo?: string) => Promise<void>
  completeSignIn: () => Promise<CompletedSignInResult>
  logout: () => Promise<void>
}

// Kept in a .ts file, apart from the provider component, so the react-refresh lint rule does not
// flag the hooks exported beside it.
export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (value === null) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }
  return value
}

// Pages beneath RequireAuth get a non-null user, so they need no null checks of their own.
export function useCurrentUser(): User {
  const { currentUser } = useAuth()
  if (currentUser === null) {
    throw new Error('useCurrentUser must be used beneath RequireAuth, which guarantees a signed-in user.')
  }
  return currentUser
}
