import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import type { Role } from '@/features/auth/types'
import { API_BASE_URL } from '@/shared/api/client'
import { createSseClient } from '@/shared/api/sseClient'
import { reportLiveStatus, resetLiveConnection } from './liveConnectionStore'

export const LIVE_STREAM_PATH = '/api/v1/public/stream'

// One stream for the signed-in session, not one per page. The server is the source of truth, so no
// event's payload is applied directly: every journey event, a reset, and a reconnect invalidate the
// journey queries and the pages read the facts again.
export function useLiveUpdates(role: Role | null): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    // The public stream has no operations reads behind it, so an auditor has nothing to refresh.
    if (role !== 'network_controller') {
      return
    }

    const refreshJourneys = () => {
      void queryClient.invalidateQueries({ queryKey: ['journeys'] })
    }

    // A reconnect may have crossed a gap the server could not replay, so it reads again even when no
    // frame arrived before the connection was re-established.
    let wasReconnecting = false

    const client = createSseClient(`${API_BASE_URL}${LIVE_STREAM_PATH}`, {
      onEvent: refreshJourneys,
      onReset: refreshJourneys,
      onStatus: (status) => {
        reportLiveStatus(status)
        if (status === 'open' && wasReconnecting) {
          refreshJourneys()
        }
        wasReconnecting = status === 'reconnecting'
      },
    })

    return () => {
      client.close()
      resetLiveConnection()
    }
  }, [queryClient, role])
}
