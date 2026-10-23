import { Link } from 'react-router'
import ErrorPage from '@/shared/ui/ErrorPage'

// Only invalid paths reach this route. A valid page that is missing data is handled by QueryState.
export default function NotFoundPage() {
  return (
    <ErrorPage
      title="Page not found"
      message="This address does not match a page in SmartRail Operations."
      actions={<Link to="/board">Go to the live board</Link>}
    />
  )
}
