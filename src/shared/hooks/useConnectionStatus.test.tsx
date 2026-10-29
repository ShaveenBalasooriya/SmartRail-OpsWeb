import { QueryClient, QueryClientProvider, onlineManager, useQuery } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { reportLiveStatus, resetLiveConnection } from '@/shared/live/liveConnectionStore'
import { CONNECTING_GRACE_MS, useConnectionStatus } from './useConnectionStatus'

function Probe({ fail = false }: { fail?: boolean }) {
  useQuery({
    queryKey: ['connection-probe', fail],
    queryFn: fail ? () => Promise.reject(new Error('Request failed')) : () => Promise.resolve('ok'),
    retry: false,
  })

  return <span data-testid="status">{useConnectionStatus()}</span>
}

function renderProbe(fail = false) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <QueryClientProvider client={queryClient}>
      <Probe fail={fail} />
    </QueryClientProvider>,
  )
}

describe('useConnectionStatus', () => {
  afterEach(() => {
    onlineManager.setOnline(true)
    resetLiveConnection()
  })

  it('reports live while the browser is online and queries are healthy', async () => {
    renderProbe()

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('live'))
  })

  it('reports degraded when an active query has failed', async () => {
    renderProbe(true)

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('degraded'))
  })

  it('reports offline when the browser loses its connection, and live again when it returns', async () => {
    renderProbe()

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('live'))

    act(() => onlineManager.setOnline(false))
    expect(screen.getByTestId('status')).toHaveTextContent('offline')

    act(() => onlineManager.setOnline(true))
    expect(screen.getByTestId('status')).toHaveTextContent('live')
  })

  it('shows the first connect as connecting, and degraded once its grace period runs out', () => {
    vi.useFakeTimers()
    try {
      renderProbe()

      act(() => reportLiveStatus('connecting'))
      expect(screen.getByTestId('status')).toHaveTextContent('connecting')

      act(() => vi.advanceTimersByTime(CONNECTING_GRACE_MS - 1))
      expect(screen.getByTestId('status')).toHaveTextContent('connecting')

      act(() => vi.advanceTimersByTime(1))
      expect(screen.getByTestId('status')).toHaveTextContent('degraded')
    } finally {
      vi.useRealTimers()
    }
  })

  it('reports degraded immediately while the live stream is reconnecting', () => {
    renderProbe()

    act(() => reportLiveStatus('connecting'))
    expect(screen.getByTestId('status')).toHaveTextContent('connecting')

    act(() => reportLiveStatus('open'))
    expect(screen.getByTestId('status')).toHaveTextContent('live')

    act(() => reportLiveStatus('reconnecting'))
    expect(screen.getByTestId('status')).toHaveTextContent('degraded')
  })

  it('lets an open stream outrank a failed query', async () => {
    renderProbe(true)

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('degraded'))

    act(() => reportLiveStatus('open'))
    expect(screen.getByTestId('status')).toHaveTextContent('live')
  })

  it('reports offline when the stream closed after a failure', () => {
    renderProbe()

    act(() => reportLiveStatus('reconnecting'))
    act(() => reportLiveStatus('closed'))

    expect(screen.getByTestId('status')).toHaveTextContent('offline')
  })

  it('still reports the browser as offline while the stream believes it is open', () => {
    renderProbe()

    act(() => reportLiveStatus('open'))
    act(() => onlineManager.setOnline(false))

    expect(screen.getByTestId('status')).toHaveTextContent('offline')
  })
})
