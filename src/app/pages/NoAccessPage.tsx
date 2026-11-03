import { useAuth } from '@/app/providers/AuthContext'
import Button from '@/shared/components/Button'
import ErrorPage from '@/shared/ui/ErrorPage'

// Reached by a signed-in staff member whose groups carry no operations role (a guard, or an account
// with none of the two known groups). Rendered outside the guards: there is no page to show them.
// It uses the sign-in card's shape but keeps the only action that helps: sign out and try another account.
export default function NoAccessPage() {
  const { logout } = useAuth()

  return (
    <ErrorPage
      title="No access for this role"
      message="You are signed in, but this account's role cannot use SmartRail Operations. Sign out to try another account."
      actions={<Button onClick={() => void logout()}>Sign out</Button>}
    />
  )
}
