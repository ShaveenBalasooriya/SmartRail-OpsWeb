import { Link } from 'react-router'
import ErrorPage from '@/shared/ui/ErrorPage'

export default function UnauthorizedPage() {
  return (
    <ErrorPage
      title="Sign in to continue"
      message="This page is for signed-in SmartRail staff. Sign in, then return to this address."
      actions={<Link to="/login">Go to sign in</Link>}
    />
  )
}
