import { getAccessToken, notifyUnauthorized } from './authBridge'
import { createHttpClient } from './httpClient'

// The composition root for the API. The path is root-relative: in development the Vite dev server
// proxies /api to the SmartRail API (vite.config.ts), so the browser never sees another origin. The
// token source is registered at startup (main.tsx) so this module stays free of feature imports.
export const API_BASE_URL = ''

// The live stream is built from the same base as every other API call, so moving the API means
// changing one value.
export const api = createHttpClient(API_BASE_URL, {
  getAccessToken,
  onUnauthorized: notifyUnauthorized,
})
