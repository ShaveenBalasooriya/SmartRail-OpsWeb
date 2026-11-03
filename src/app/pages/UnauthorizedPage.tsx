import { Link, useLocation } from 'react-router'
import ErrorPage from '@/shared/ui/ErrorPage'

// The attempted address travels with the link, so sign-in can return the user to it.
export default function UnauthorizedPage() {
  const location = useLocation()
  const from = `${location.pathname}${location.search}`

  return (
    <ErrorPage
      title="Sign in to continue"
      message="This page is for signed-in SmartRail staff. Sign in, then return to this address."
      actions={<Link to="/login" state={{ from }}>Go to sign in</Link>}
    />
  )
}
