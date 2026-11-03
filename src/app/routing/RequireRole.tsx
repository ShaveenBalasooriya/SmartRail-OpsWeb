import { Navigate, Outlet } from 'react-router'
import { useAuth } from '@/app/providers/AuthContext'
import ForbiddenPage from '@/app/pages/ForbiddenPage'
import type { Role } from '@/features/auth/types'
import LoadingIndicator from '@/shared/ui/LoadingIndicator'

type RequireRoleProps = {
  allowedRoles: Role[]
}

// Mirrors RequireAuth: the forbidden state renders in place. A null user is only reachable if this
// guard is mounted outside RequireAuth, so it falls back to the sign-in page instead of crashing.
export default function RequireRole({ allowedRoles }: RequireRoleProps) {
  const { currentUser, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingIndicator />
  }

  if (currentUser === null) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(currentUser.role)) {
    return <ForbiddenPage />
  }

  return <Outlet />
}
