import { UserManager, WebStorageStateStore } from 'oidc-client-ts'

// Defaults match the local Authentik blueprint. They are overridable for another environment, but
// the redirect URI is fixed by the app's own origin: Authentik only allows http://localhost:5173/.
const DEFAULT_AUTHORITY = 'http://localhost:9000/application/o/smartrail-staff/'
const DEFAULT_CLIENT_ID = 'smartrail-staff'

// A public client: authorization code + PKCE (the library's default when no secret is set), no
// client secret. offline_access yields a refresh token, so automaticSilentRenew can renew the
// 15-minute access token without another redirect. sessionStorage means closing the tab ends it.
export const userManager = new UserManager({
  authority: import.meta.env.VITE_OIDC_AUTHORITY || DEFAULT_AUTHORITY,
  client_id: import.meta.env.VITE_OIDC_CLIENT_ID || DEFAULT_CLIENT_ID,
  redirect_uri: `${window.location.origin}/auth/callback`,
  post_logout_redirect_uri: `${window.location.origin}/login`,
  response_type: 'code',
  scope: 'openid profile offline_access',
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  automaticSilentRenew: true,
  // The app has no need to poll Authentik's session iframe; sign-out goes through the redirect.
  monitorSession: false,
})
