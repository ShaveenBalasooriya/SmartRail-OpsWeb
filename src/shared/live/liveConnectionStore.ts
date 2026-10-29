// The live stream's connection state, shared by the one useLiveUpdates effect and the navbar chip.
// An external store rather than context because the writer is an effect and the reader is a sibling
// of the layout, and the navbar should not re-render whenever the stream's frames arrive.
export type LiveStreamStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed'

export type LiveConnection = {
  status: LiveStreamStatus
  // True once a connection attempt has failed since the last successful open. A closed stream that
  // never opened is not a failure; a closed stream that lost its connection is.
  hasFailed: boolean
  // When the first connection attempt started, or null when the stream is not making a first attempt.
  // The API only flushes the stream's headers with its first keep-alive, so a healthy first connection
  // can sit unopened for several seconds; the chip needs the start time to tell that from a broken one.
  connectingSince: number | null
}

const IDLE: LiveConnection = { status: 'idle', hasFailed: false, connectingSince: null }

let snapshot: LiveConnection = IDLE
const listeners = new Set<() => void>()

export function getLiveConnection(): LiveConnection {
  return snapshot
}

export function subscribeLiveConnection(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function reportLiveStatus(status: LiveStreamStatus, now = Date.now()): void {
  const hasFailed =
    status === 'open' ? false : status === 'reconnecting' ? true : snapshot.hasFailed

  // Only a first attempt with no failure behind it is given the grace period; any reconnect keeps null
  // so the chip reports it as degraded straight away.
  const connectingSince =
    status === 'connecting' && !hasFailed ? (snapshot.connectingSince ?? now) : null

  publish({ status, hasFailed, connectingSince })
}

// Called when the stream is torn down, so a later sign-in does not inherit the previous session's state.
export function resetLiveConnection(): void {
  publish(IDLE)
}

function publish(next: LiveConnection): void {
  if (
    next.status === snapshot.status &&
    next.hasFailed === snapshot.hasFailed &&
    next.connectingSince === snapshot.connectingSince
  ) {
    return
  }

  snapshot = next
  for (const listener of listeners) {
    listener()
  }
}
