// Typed names for the environment values the app reads. Vite's client types already accept any
// VITE_ name, so this only documents them. The file is a module (moduleDetection is "force"), so the
// merge into the global ImportMetaEnv is declared explicitly.
export {}

declare global {
  interface ImportMetaEnv {
    // Authentik staff client. Defaults match the local blueprint (see features/auth/api/userManager.ts).
    readonly VITE_OIDC_AUTHORITY?: string
    readonly VITE_OIDC_CLIENT_ID?: string
  }
}
