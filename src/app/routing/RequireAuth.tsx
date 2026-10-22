import { Outlet } from 'react-router'
import { useAuth } from '@/app/providers/AuthContext'
import UnauthorizedPage from '@/app/pages/UnauthorizedPage'
import LoadingIndicator from '@/shared/ui/LoadingIndicator'

// Guards render in place rather than redirecting. A silent redirect drops the user's context and
// explains nothing. Rendering the error at the attempted URL keeps the address bar honest, and the
// user can sign in and retry at the same address.
export default function RequireAuth() {
  const { currentUser, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingIndicator />
  }

  if (currentUser === null) {
    return <UnauthorizedPage />
  }

  return <Outlet />
}
