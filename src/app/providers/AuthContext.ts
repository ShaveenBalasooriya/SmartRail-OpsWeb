import { createContext, useContext } from 'react'
import type { Role, User } from '@/features/auth/types'

export type AuthContextValue = {
  currentUser: User | null
  isLoading: boolean
  login: (role: Role) => Promise<User>
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
