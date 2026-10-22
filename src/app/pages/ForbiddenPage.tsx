import { Link } from 'react-router'
import ErrorPage from '@/shared/ui/ErrorPage'

export default function ForbiddenPage() {
  return (
    <ErrorPage
      title="You do not have access to this page"
      message="Your role does not allow it. Use the navigation to choose a page your role can open."
      actions={<Link to="/board">Go to the live board</Link>}
    />
  )
}
