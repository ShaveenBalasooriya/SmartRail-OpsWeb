import { createHttpClient } from './httpClient'

// The composition root for the API. The path is root-relative: in development the Vite dev server
// proxies /api to the SmartRail API (vite.config.ts), so the browser never sees another origin.
export const api = createHttpClient('')
