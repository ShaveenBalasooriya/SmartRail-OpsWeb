import { Navigate, Outlet } from 'react-router'
import { useAuth } from '@/app/providers/AuthContext'
import UnauthorizedPage from '@/app/pages/UnauthorizedPage'
import LoadingIndicator from '@/shared/ui/LoadingIndicator'

// Guards render in place rather than redirecting. A silent redirect drops the user's context and
// explains nothing. Rendering the error at the attempted URL keeps the address bar honest, and the
// user can sign in and retry at the same address. A signed-in person without an operations role is
// the one case with no page at all, so they are sent to the dedicated no-access screen.
export default function RequireAuth() {
  const { currentUser, isSignedIn, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingIndicator />
  }

  if (!isSignedIn) {
    return <UnauthorizedPage />
  }

  if (currentUser === null) {
    return <Navigate to="/no-access" replace />
  }

  return <Outlet />
}
