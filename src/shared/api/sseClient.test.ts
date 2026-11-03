import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSseClient, type SseStatus } from './sseClient'

const fetchMock = vi.fn<typeof fetch>()

type Feed = {
  response: Response
  push: (text: string) => void
  close: () => void
}

// A response whose body can be fed frame by frame, so the client is tested against the same streaming
// behaviour a real SSE connection has, including chunks that end mid-field.
function createFeed(): Feed {
  let stream: ReadableStreamDefaultController<Uint8Array> | null = null
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      stream = controller
    },
  })
  const encoder = new TextEncoder()

  return {
    response: new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
    push(text) {
      stream?.enqueue(encoder.encode(text))
    },
    close() {
      stream?.close()
    },
  }
}

function createClient() {
  const onEvent = vi.fn()
  const onReset = vi.fn()
  const statuses: SseStatus[] = []

  const client = createSseClient('/api/v1/public/stream', {
    onEvent,
    onReset,
    onStatus: (status) => statuses.push(status),
    // Deterministic jitter: 0.5 is a factor of 1, so the backoff is exactly 1 s, 2 s, 4 s...
    random: () => 0.5,
  })

  return { client, onEvent, onReset, statuses }
}

async function flush(): Promise<void> {
  for (let index = 0; index < 25; index += 1) {
    await Promise.resolve()
  }
}

async function advance(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms)
  await flush()
}

function lastRequestHeaders(call: number): Headers {
  return new Headers(fetchMock.mock.calls[call]?.[1]?.headers)
}

describe('createSseClient', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.useRealTimers()
    fetchMock.mockReset()
    vi.unstubAllGlobals()
  })

  it('reports connecting then open and delivers a parsed frame', async () => {
    const feed = createFeed()
    fetchMock.mockResolvedValue(feed.response)

    const { client, onEvent, statuses } = createClient()
    expect(statuses).toEqual(['connecting'])

    await flush()
    expect(statuses).toEqual(['connecting', 'open'])
    expect(client.status()).toBe('open')

    feed.push('id: 7\nevent: delay_published\ndata: {"journeyId":"j1","delayMinutes":5}\n\n')
    await flush()

    expect(onEvent).toHaveBeenCalledWith('delay_published', { journeyId: 'j1', delayMinutes: 5 }, '7')
    client.close()
  })

  it('ignores keep-alive comments', async () => {
    const feed = createFeed()
    fetchMock.mockResolvedValue(feed.response)

    const { client, onEvent, onReset } = createClient()
    await flush()

    feed.push(': keep-alive\n\n')
    await flush()

    expect(onEvent).not.toHaveBeenCalled()
    expect(onReset).not.toHaveBeenCalled()
    client.close()
  })

  it('assembles a frame split across chunks', async () => {
    const feed = createFeed()
    fetchMock.mockResolvedValue(feed.response)

    const { client, onEvent } = createClient()
    await flush()

    feed.push('id: 8\nevent: platform_change_pub')
    await flush()
    feed.push('lished\ndata: {"a":1')
    await flush()
    feed.push('}\n')
    await flush()
    feed.push('\n')
    await flush()

    expect(onEvent).toHaveBeenCalledWith('platform_change_published', { a: 1 }, '8')
    client.close()
  })

  it('reconnects after the stream ends and resends Last-Event-ID', async () => {
    const first = createFeed()
    const second = createFeed()
    fetchMock.mockResolvedValueOnce(first.response).mockResolvedValueOnce(second.response)

    const { client, statuses } = createClient()
    await flush()

    first.push('id: 12\nevent: delay_published\ndata: {}\n\n')
    await flush()
    first.close()
    await flush()

    expect(statuses).toEqual(['connecting', 'open', 'reconnecting'])

    await advance(1000)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(lastRequestHeaders(1).get('Last-Event-ID')).toBe('12')
    expect(statuses.at(-1)).toBe('open')
    client.close()
  })

  it('keeps the last id across a reset frame without an id', async () => {
    const first = createFeed()
    const second = createFeed()
    fetchMock.mockResolvedValueOnce(first.response).mockResolvedValueOnce(second.response)

    const { client, onEvent, onReset } = createClient()
    await flush()

    first.push('id: 20\nevent: correction_published\ndata: {}\n\nevent: reset\ndata: {}\n\n')
    await flush()

    expect(onEvent).toHaveBeenCalledTimes(1)
    expect(onReset).toHaveBeenCalledTimes(1)

    first.close()
    await flush()
    await advance(1000)

    expect(lastRequestHeaders(1).get('Last-Event-ID')).toBe('20')
    client.close()
  })

  it('advances the last id for an unknown event name', async () => {
    const first = createFeed()
    const second = createFeed()
    fetchMock.mockResolvedValueOnce(first.response).mockResolvedValueOnce(second.response)

    const { client } = createClient()
    await flush()

    first.push('id: 31\nevent: something_new\ndata: {}\n\n')
    await flush()
    first.close()
    await flush()
    await advance(1000)

    expect(lastRequestHeaders(1).get('Last-Event-ID')).toBe('31')
    client.close()
  })

  it('waits at least as long as a 429 Retry-After header', async () => {
    const feed = createFeed()
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 429, headers: { 'Retry-After': '2' } }))
      .mockResolvedValueOnce(feed.response)

    const { client, statuses } = createClient()
    await flush()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(statuses).toEqual(['connecting', 'reconnecting'])

    await advance(1999)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await advance(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    client.close()
  })

  it('treats a 200 that is not an event stream as a failed attempt', async () => {
    const feed = createFeed()
    fetchMock
      .mockResolvedValueOnce(
        new Response('<html>Sign in</html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        }),
      )
      .mockResolvedValueOnce(feed.response)

    const { client, statuses } = createClient()
    await flush()

    expect(statuses).toEqual(['connecting', 'reconnecting'])

    await advance(1000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(statuses.at(-1)).toBe('open')
    client.close()
  })

  it('reconnects when response headers never arrive within the idle window', async () => {
    const feed = createFeed()
    fetchMock
      .mockImplementationOnce(
        (_input, init) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              reject(new DOMException('The request was aborted.', 'AbortError'))
            })
          }),
      )
      .mockResolvedValueOnce(feed.response)

    const { client, statuses } = createClient()
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await advance(45_000)
    expect(statuses).toContain('reconnecting')

    await advance(1000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(statuses.at(-1)).toBe('open')
    client.close()
  })

  it('treats 45 s with no bytes at all as a dead connection and reconnects', async () => {
    const first = createFeed()
    const second = createFeed()
    fetchMock.mockResolvedValueOnce(first.response).mockResolvedValueOnce(second.response)

    const { client, statuses } = createClient()
    await flush()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await advance(45_000)
    expect(statuses).toContain('reconnecting')

    await advance(1000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    client.close()
  })

  it('keeps a connection alive while keep-alive comments arrive', async () => {
    const first = createFeed()
    const second = createFeed()
    fetchMock.mockResolvedValueOnce(first.response).mockResolvedValueOnce(second.response)

    const { client } = createClient()
    await flush()

    await advance(40_000)
    first.push(': keep-alive\n\n')
    await flush()

    // The heartbeat at 40 s re-arms the watchdog, so 44 s later the connection is still fine.
    await advance(44_000)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await advance(2000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    client.close()
  })

  it('stops reconnecting and reports closed after close()', async () => {
    const feed = createFeed()
    fetchMock.mockResolvedValue(feed.response)

    const { client, statuses } = createClient()
    await flush()

    client.close()
    expect(statuses.at(-1)).toBe('closed')

    await advance(120_000)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
