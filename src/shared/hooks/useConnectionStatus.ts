import { onlineManager, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { getLiveConnection, subscribeLiveConnection } from '@/shared/live/liveConnectionStore'

export type ConnectionStatus = 'live' | 'connecting' | 'degraded' | 'offline'

// The API flushes the stream's response headers with its first keep-alive, so on a quiet network a healthy
// first connection can stay unopened for around fifteen seconds. The chip waits this long before calling
// that degraded; a failed attempt or a reconnect skips the wait entirely.
export const CONNECTING_GRACE_MS = 20_000

// A query counts only while a mounted observer is using it, so a stale error on a page nobody is
// looking at cannot leave the whole app marked as degraded.
function hasActiveQueryError(queryClient: QueryClient): boolean {
  return queryClient
    .getQueryCache()
    .getAll()
    .some((query) => query.state.status === 'error' && query.getObserversCount() > 0)
}

// Drives the navbar connection chip. For a signed-in Network Controller the live stream is the better
// signal: an open stream means the API is reachable even while a page's query is failing, and a stream
// that is connecting or reconnecting means the board may be behind. Everyone else (Auditors) has no
// stream, so the browser's online state and active query errors still decide.
export function useConnectionStatus(): ConnectionStatus {
  const queryClient = useQueryClient()
  const [isOnline, setIsOnline] = useState(() => onlineManager.isOnline())
  const [hasQueryError, setHasQueryError] = useState(() => hasActiveQueryError(queryClient))
  const [now, setNow] = useState(() => Date.now())
  const live = useSyncExternalStore(subscribeLiveConnection, getLiveConnection)

  useEffect(() => onlineManager.subscribe((online) => setIsOnline(online)), [])

  useEffect(() => {
    const update = () => setHasQueryError(hasActiveQueryError(queryClient))

    // Read once on mount: a query may already have failed before this component subscribed.
    update()
    return queryClient.getQueryCache().subscribe(update)
  }, [queryClient])

  // The grace period is time-based, so the chip has to re-render when it runs out even though no store
  // change arrives: nothing else tells this component that twenty seconds have passed. The deadline comes
  // from the store's start time, and this effect arms the one timer that re-renders at its end.
  const graceDeadline =
    live.status === 'connecting' && !live.hasFailed && live.connectingSince !== null
      ? live.connectingSince + CONNECTING_GRACE_MS
      : null

  useEffect(() => {
    if (graceDeadline === null) {
      return
    }

    const remaining = graceDeadline - Date.now()
    if (remaining <= 0) {
      return
    }

    const timer = setTimeout(() => setNow(Date.now()), remaining)
    return () => clearTimeout(timer)
  }, [graceDeadline])

  const isFirstConnectWaiting = graceDeadline !== null && now < graceDeadline

  if (!isOnline) {
    return 'offline'
  }

  if (live.status === 'open') {
    return 'live'
  }

  if (live.status === 'connecting') {
    return live.hasFailed || !isFirstConnectWaiting ? 'degraded' : 'connecting'
  }

  if (live.status === 'reconnecting') {
    return 'degraded'
  }

  // A stream that closed after failing could not reach the API, and nothing else has proved it can.
  if (live.status === 'closed' && live.hasFailed) {
    return 'offline'
  }

  return hasQueryError ? 'degraded' : 'live'
}
