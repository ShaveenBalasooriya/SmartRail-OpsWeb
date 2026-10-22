import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/shared/api/ApiError'

// The defaults are tuned for an internal operations tool, not a public site (see README.md).
// staleTime keeps the board from refetching on every render; the board's own refresh control and
// "last updated" line make freshness visible instead. Focus refetching is off because switching
// windows should not change the numbers under a controller's eyes without them asking.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: shouldRetry,
      refetchOnWindowFocus: false,
    },
  },
})

// A 401, 403 or 404 will not change on a retry (the session or role is missing, or the resource is
// absent), so it fails at once and the screen shows the outcome without a delay. Other failures
// get at most two retries.
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
    return false
  }

  return failureCount < 2
}
