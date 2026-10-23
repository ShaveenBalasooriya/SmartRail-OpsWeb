// Typed names for the endpoint-group flags read by src/shared/api/mockSwitch.ts. Vite's client types
// already accept any VITE_ name, so this only documents the three that the app uses. The file is a module
// (moduleDetection is "force"), so the merge into the global ImportMetaEnv is declared explicitly.
export {}

declare global {
  interface ImportMetaEnv {
    readonly VITE_USE_REAL_OPERATIONS?: string
    readonly VITE_USE_REAL_AUDIT?: string
    readonly VITE_USE_REAL_STREAM?: string
  }
}
