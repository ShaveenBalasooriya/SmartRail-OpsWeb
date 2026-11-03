import { createSseFrameParser, type SseFrame } from './sseFrames'

// A fetch-based Server-Sent Events client. fetch is used rather than EventSource because the browser's
// EventSource cannot set the Last-Event-ID header itself, cannot be given an AbortSignal, and hides the
// response status behind a generic error event. The reconnect, heartbeat and backoff rules live here so
// the server stays the only source of journey state.
export type SseStatus = 'connecting' | 'open' | 'reconnecting' | 'closed'

export type SseClientOptions = {
  onEvent: (event: string, data: unknown, id: string | null) => void
  onReset: () => void
  onStatus: (status: SseStatus) => void
  // Test seam for the backoff jitter, 0..1. Math.random in the app.
  random?: () => number
}

export type SseClient = {
  // The current state, for callers that mount mid-connection and need a first value.
  status: () => SseStatus
  close: () => void
}

const INITIAL_BACKOFF_MS = 1_000
const MAX_BACKOFF_MS = 30_000
// The API writes a keep-alive comment at least every twenty seconds, so a quiet minute means the
// connection is dead even if the socket has not noticed.
const IDLE_TIMEOUT_MS = 45_000
// A connection that lasted this long did real work, so the next attempt starts again at one second
// instead of carrying the previous outage's backoff.
const STABLE_CONNECTION_MS = 5_000

export function createSseClient(url: string, options: SseClientOptions): SseClient {
  const random = options.random ?? Math.random

  let closed = false
  let status: SseStatus = 'closed'
  let lastEventId: string | null = null
  let attempt = 0
  let controller: AbortController | null = null
  let activeReader: ReadableStreamDefaultReader<Uint8Array> | null = null
  let idleTimer: ReturnType<typeof setTimeout> | null = null
  let wake: (() => void) | null = null

  function emitStatus(next: SseStatus): void {
    if (next === status) {
      return
    }
    status = next
    options.onStatus(next)
  }

  function clearIdleTimer(): void {
    if (idleTimer !== null) {
      clearTimeout(idleTimer)
      idleTimer = null
    }
  }

  function armIdleTimer(): void {
    clearIdleTimer()
    idleTimer = setTimeout(() => {
      idleTimer = null
      // Abort the request and cancel the body read. A real fetch rejects the pending read when its
      // signal aborts; cancelling as well means the watchdog works even for a body that ignores it.
      controller?.abort()
      cancelActiveReader()
    }, IDLE_TIMEOUT_MS)
  }

  function cancelActiveReader(): void {
    if (activeReader !== null) {
      void activeReader.cancel().catch(() => undefined)
    }
  }

  // A close() during the backoff wait must cut the wait short rather than leave a timer behind.
  function wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        wake = null
        resolve()
      }, ms)
      wake = () => {
        clearTimeout(timer)
        wake = null
        resolve()
      }
    })
  }

  function handleFrame(frame: SseFrame): void {
    // An unknown event name still advances the last id, so a reconnect never replays it twice.
    if (frame.id !== null) {
      lastEventId = frame.id
    }

    if (frame.event === 'reset') {
      options.onReset()
      return
    }

    options.onEvent(frame.event, parseData(frame.data), frame.id)
  }

  async function read(body: ReadableStream<Uint8Array>, signal: AbortSignal): Promise<void> {
    const reader = body.getReader()
    activeReader = reader
    const decoder = new TextDecoder()
    const parser = createSseFrameParser()

    try {
      while (!closed && !signal.aborted) {
        const { done, value } = await reader.read()
        if (done) {
          return
        }

        // Any byte, including a keep-alive comment, proves the connection is alive.
        armIdleTimer()

        for (const frame of parser.push(decoder.decode(value, { stream: true }))) {
          handleFrame(frame)
        }
      }
    } finally {
      activeReader = null
      reader.releaseLock()
    }
  }

  type Outcome =
    | { kind: 'stream' }
    | { kind: 'failure'; retryAfterMs: number | null }

  async function connectOnce(): Promise<Outcome> {
    controller = new AbortController()
    const headers = new Headers({ Accept: 'text/event-stream' })
    if (lastEventId !== null) {
      headers.set('Last-Event-ID', lastEventId)
    }

    // The watchdog starts before the response arrives: the API flushes its headers with the first
    // keep-alive, so a socket that never writes anything must not sit in "connecting" for ever.
    armIdleTimer()

    let response: Response
    try {
      response = await fetch(url, {
        headers,
        signal: controller.signal,
        cache: 'no-store',
      })
    } catch {
      clearIdleTimer()
      return { kind: 'failure', retryAfterMs: null }
    }

    if (response.status === 429) {
      // A rate-limited server names how long to wait. The backoff below waits at least that long.
      const retryAfterMs = parseRetryAfter(response.headers.get('Retry-After'))
      clearIdleTimer()
      await discard(response)
      return { kind: 'failure', retryAfterMs }
    }

    // A 200 that is not an event stream (a proxy's sign-in page, for example) is a broken wiring, not
    // a quiet connection: it fails and retries instead of sitting silent until the idle watchdog.
    const contentType = response.headers.get('content-type') ?? ''
    if (!response.ok || response.body === null || !contentType.startsWith('text/event-stream')) {
      clearIdleTimer()
      await discard(response)
      return { kind: 'failure', retryAfterMs: null }
    }

    const openedAt = Date.now()
    emitStatus('open')
    armIdleTimer()

    try {
      await read(response.body, controller.signal)
    } catch {
      // A reset socket, a network drop and the idle abort all arrive here; all of them reconnect.
    } finally {
      clearIdleTimer()
    }

    if (Date.now() - openedAt >= STABLE_CONNECTION_MS) {
      attempt = 0
    }

    return { kind: 'stream' }
  }

  async function run(): Promise<void> {
    while (!closed) {
      emitStatus(attempt === 0 ? 'connecting' : 'reconnecting')

      const outcome = await connectOnce()
      if (closed) {
        break
      }

      emitStatus('reconnecting')
      attempt += 1

      const backoff = backoffFor(attempt)
      const delay =
        outcome.kind === 'failure' && outcome.retryAfterMs !== null
          ? Math.max(outcome.retryAfterMs, backoff)
          : backoff

      await wait(delay)
    }
  }

  function backoffFor(failedAttempts: number): number {
    const exponential = Math.min(MAX_BACKOFF_MS, INITIAL_BACKOFF_MS * 2 ** (failedAttempts - 1))
    // Full-ish jitter: several controllers reconnecting after one outage should not arrive together.
    const jitter = 0.8 + random() * 0.4
    return Math.round(exponential * jitter)
  }

  function close(): void {
    if (closed) {
      return
    }

    closed = true
    clearIdleTimer()
    controller?.abort()
    cancelActiveReader()
    wake?.()
    emitStatus('closed')
  }

  void run()

  return { status: () => status, close }
}

// Retry-After is either a number of seconds or an HTTP date. Anything else is ignored and the normal
// backoff applies.
function parseRetryAfter(value: string | null): number | null {
  if (value === null) {
    return null
  }

  const trimmed = value.trim()
  if (trimmed === '') {
    return null
  }

  const seconds = Number(trimmed)
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000
  }

  const date = Date.parse(trimmed)
  if (Number.isNaN(date)) {
    return null
  }

  return Math.max(0, date - Date.now())
}

async function discard(response: Response): Promise<void> {
  try {
    await response.body?.cancel()
  } catch {
    // The body is being thrown away; a failed cancel changes nothing.
  }
}

function parseData(data: string): unknown {
  if (data === '') {
    return undefined
  }

  try {
    return JSON.parse(data) as unknown
  } catch {
    // A frame that is not JSON is still a real event; the caller invalidates either way.
    return undefined
  }
}
