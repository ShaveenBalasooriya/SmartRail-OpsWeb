// Cross-cutting, not owned by any one domain: the navbar, guards, and every page need the signed-in
// user, so it lives here and not in a business feature.

export type Role = 'network_controller' | 'auditor'

export const ROLE_VALUES: Role[] = ['network_controller', 'auditor']

export const ROLE_LABELS: Record<Role, string> = {
  network_controller: 'Network Controller',
  auditor: 'Auditor',
}

export type User = {
  id: string
  displayName: string
  role: Role
}

// Untrusted input (sessionStorage, a URL) is checked against the allow-list before use.
export function isRole(value: string): value is Role {
  return (ROLE_VALUES as string[]).includes(value)
}
