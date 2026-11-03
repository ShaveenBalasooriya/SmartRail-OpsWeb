import { Navigate } from 'react-router'
import { useCurrentUser } from '@/app/providers/AuthContext'

// The signed-in landing page. The operations reads are Network Controller-only at the API, so sending an
// auditor to /board would only show them the 403 page; their work starts at the audit record instead.
// This sits beneath RequireAuth, so a guard (signed in with no operations role) still meets the existing
// no-access screen and a signed-out visitor still meets the sign-in page.
export default function RoleHome() {
  const { role } = useCurrentUser()

  return <Navigate to={role === 'auditor' ? '/audit' : '/board'} replace />
}
