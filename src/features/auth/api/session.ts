import { isRole, type Role, type User } from '../types'

// The identity source behind the app. The UI depends only on this interface, so replacing the dev
// implementation below with real sign-in changes this file and nothing else.
export type SessionService = {
  getCurrentUser: () => Promise<User | null>
  login: (role: Role) => Promise<User>
  logout: () => Promise<void>
}

// DEV-ONLY PLACEHOLDER, not authentication. The real sign-in is Authentik OIDC
// (authorization code + PKCE) with the role read from the token's `groups` claim, and it arrives
// with the backend change `add-identity-access`. Until then a developer picks a role on /login and
// the choice is kept in sessionStorage. Replace this object with the OIDC implementation; the
// guards, the navbar and the API client already expect a signed-in user or a bearer token.
const DEV_SESSION_KEY = 'smartrail.dev-session'

const DEV_DISPLAY_NAMES: Record<Role, string> = {
  network_controller: 'Dev Network Controller',
  auditor: 'Dev Auditor',
}

function userFor(role: Role): User {
  return { id: `dev-${role}`, displayName: DEV_DISPLAY_NAMES[role], role }
}

function readStoredRole(): Role | null {
  try {
    const value = window.sessionStorage.getItem(DEV_SESSION_KEY)
    return value !== null && isRole(value) ? value : null
  } catch {
    return null
  }
}

export const sessionService: SessionService = {
  async getCurrentUser() {
    const role = readStoredRole()
    return role === null ? null : userFor(role)
  },

  async login(role) {
    window.sessionStorage.setItem(DEV_SESSION_KEY, role)
    return userFor(role)
  },

  async logout() {
    window.sessionStorage.removeItem(DEV_SESSION_KEY)
  },
}
