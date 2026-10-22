import Button from '@/shared/components/Button'
import ErrorPage from '@/shared/ui/ErrorPage'

// The errorElement for render crashes. QueryState only covers query errors, so this is the
// last line of defence. It names no error text because a crash message can carry internals.
export default function RouteErrorPage() {
  return (
    <ErrorPage
      title="Something went wrong"
      message="This page hit an unexpected problem. Reload to try again."
      actions={<Button onClick={() => window.location.reload()}>Reload page</Button>}
    />
  )
}
