import { ROLE_VALUES, type Role } from '../types'

// Authentik puts staff group names in the token's `groups` claim. A token may carry several groups;
// the API refuses a staff member with more than one operations role, so this check does the same and
// the app never picks one arbitrarily. A guard (or any other group) is signed in without access.
export function roleFromGroups(groups: unknown): Role | null {
  if (!Array.isArray(groups)) {
    return null
  }

  const known = groups.filter((group): group is Role => typeof group === 'string' && isOperationsRole(group))
  return known.length === 1 ? known[0] : null
}

function isOperationsRole(value: string): value is Role {
  return (ROLE_VALUES as string[]).includes(value)
}
