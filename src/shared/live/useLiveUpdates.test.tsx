import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Role } from '@/features/auth/types'
import { API_BASE_URL } from '@/shared/api/client'
import { createSseClient, type SseClientOptions } from '@/shared/api/sseClient'
import { getLiveConnection, resetLiveConnection } from './liveConnectionStore'
import { LIVE_STREAM_PATH, useLiveUpdates } from './useLiveUpdates'

vi.mock('@/shared/api/sseClient')

const createSseClientMock = vi.mocked(createSseClient)

function Harness({ role }: { role: Role | null }) {
  useLiveUpdates(role)
  return null
}

function lastOptions(): SseClientOptions {
  const options = createSseClientMock.mock.calls.at(-1)?.[1]
  if (options === undefined) {
    throw new Error('No SSE client was created.')
  }
  return options
}

function renderHarness(role: Role | null) {
  const queryClient = new QueryClient()
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const close = vi.fn()
  createSseClientMock.mockReturnValue({ close, status: () => 'closed' })

  const view = render(
    <QueryClientProvider client={queryClient}>
      <Harness role={role} />
    </QueryClientProvider>,
  )

  return { ...view, invalidate, close }
}

describe('useLiveUpdates', () => {
  beforeEach(() => {
    createSseClientMock.mockReset()
    resetLiveConnection()
  })

  afterEach(() => {
    resetLiveConnection()
  })

  it('opens one stream on the API base for a network controller', () => {
    const { close } = renderHarness('network_controller')

    expect(createSseClientMock).toHaveBeenCalledTimes(1)
    expect(createSseClientMock.mock.calls[0]?.[0]).toBe(`${API_BASE_URL}${LIVE_STREAM_PATH}`)
    expect(close).not.toHaveBeenCalled()
  })

  it('invalidates the journey queries on a journey event', () => {
    const { invalidate } = renderHarness('network_controller')

    act(() => {
      lastOptions().onEvent('delay_published', { journeyId: 'j1' }, '4')
    })

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['journeys'] })
  })

  it('invalidates and keeps listening on a reset', () => {
    const { invalidate } = renderHarness('network_controller')

    act(() => {
      lastOptions().onReset()
    })

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['journeys'] })
  })

  it('invalidates after a reconnect but not on the first open', () => {
    const { invalidate } = renderHarness('network_controller')
    const options = lastOptions()

    act(() => {
      options.onStatus('connecting')
      options.onStatus('open')
    })
    expect(invalidate).not.toHaveBeenCalled()

    act(() => {
      options.onStatus('reconnecting')
      options.onStatus('open')
    })
    expect(invalidate).toHaveBeenCalledTimes(1)
  })

  it('publishes the stream status for the connection chip', () => {
    renderHarness('network_controller')

    act(() => {
      lastOptions().onStatus('connecting')
    })
    expect(getLiveConnection()).toEqual({ status: 'connecting', hasFailed: false, connectingSince: expect.any(Number) })

    act(() => {
      lastOptions().onStatus('reconnecting')
    })
    expect(getLiveConnection()).toEqual({ status: 'reconnecting', hasFailed: true, connectingSince: null })

    act(() => {
      lastOptions().onStatus('open')
    })
    expect(getLiveConnection()).toEqual({ status: 'open', hasFailed: false, connectingSince: null })
  })

  it('does not connect for an auditor', () => {
    renderHarness('auditor')

    expect(createSseClientMock).not.toHaveBeenCalled()
    expect(getLiveConnection()).toEqual({ status: 'idle', hasFailed: false, connectingSince: null })
  })

  it('closes the stream and clears the status on unmount', () => {
    const { unmount, close } = renderHarness('network_controller')

    act(() => {
      lastOptions().onStatus('open')
    })
    expect(getLiveConnection().status).toBe('open')

    unmount()

    expect(close).toHaveBeenCalledTimes(1)
    expect(getLiveConnection()).toEqual({ status: 'idle', hasFailed: false, connectingSince: null })
  })
})
