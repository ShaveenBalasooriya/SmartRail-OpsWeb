import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/app/providers/AuthContext'
import { getJourney } from '@/features/journeys/api/journeys'
import type { JourneyDetail } from '@/features/journeys/types'
import { getStations } from '@/features/stations/api/stations'
import { ApiError } from '@/shared/api/ApiError'
import type { PublishedChange } from '../types'
import PublishedChangePage from './PublishedChangePage'

vi.mock('@/features/journeys/api/journeys')
vi.mock('@/features/stations/api/stations')

const JOURNEY_ID = '0196f2a0-0000-7000-8000-000000000001'
const JOURNEY_PATH = `/journeys/${JOURNEY_ID}`

const controller: AuthContextValue = {
  currentUser: { id: 'dev-network_controller', displayName: 'Dev Network Controller', role: 'network_controller' },
  isSignedIn: true,
  isLoading: false,
  signIn: vi.fn(),
  completeSignIn: vi.fn(),
  logout: vi.fn(),
}

const delayChange: PublishedChange = {
  id: 'c-delay',
  type: 'delay',
  values: { fromStopSequence: '4', minutes: '12' },
  publisherName: 'Mahesh Perera',
  // 01:42Z is 07:12 on the railway clock.
  publishedAt: '2026-10-28T01:42:00Z',
  provenance: 'automatically_published',
  corrected: false,
}

const detail: JourneyDetail = {
  id: JOURNEY_ID,
  serviceName: 'Podi Menike',
  lineCode: 'ML',
  lineName: 'Main Line',
  direction: 'outbound',
  status: 'running',
  delayMinutes: 12,
  lastDepartedStation: null,
  nextStation: null,
  guardName: null,
  lastUpdatedAt: '2026-10-28T01:43:00Z',
  isStale: false,
  stops: [
    {
      sequence: 4,
      stationId: 'st-4',
      stationName: 'Polgahawela',
      isCalling: true,
      scheduledArrival: null,
      scheduledDeparture: '2026-10-28T01:55:00Z',
      expectedArrival: null,
      expectedDeparture: '2026-10-28T01:58:00Z',
      actualDeparture: null,
      platformId: 'pl-4',
      platformNumber: '2',
    },
  ],
  changes: [delayChange],
}

function renderPage(changeId = 'c-delay') {
  const router = createMemoryRouter(
    [{ path: '/journeys/:journeyId/published/:changeId', element: <PublishedChangePage /> }],
    { initialEntries: [`${JOURNEY_PATH}/published/${changeId}`] },
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={controller}>
        <RouterProvider router={router} />
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

describe('PublishedChangePage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getJourney).mockResolvedValue(detail)
    vi.mocked(getStations).mockResolvedValue([])
  })

  it('titles the page with the change type and publish time', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'Delay published at 07:12' })).toBeInTheDocument()
    expect(screen.getByText('Podi Menike · the change is published.')).toBeInTheDocument()
  })

  it('shows the change, publisher, API provenance label and publish time in a summary list', async () => {
    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Delay published at 07:12' })
    const summary = screen.getByText('Change').closest('dl') as HTMLElement

    expect(within(summary).getByText('Delay of 12 minutes from stop 4')).toBeInTheDocument()
    expect(within(summary).getByText('Mahesh Perera')).toBeInTheDocument()
    expect(within(summary).getByText('Automatically published')).toBeInTheDocument()
    expect(within(summary).getByText('07:12:00')).toHaveAttribute('datetime', '2026-10-28T01:42:00Z')
  })

  it('offers the board and journey links', async () => {
    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Delay published at 07:12' })
    expect(screen.getByRole('link', { name: 'Back to the live board' })).toHaveAttribute('href', '/board')
    expect(screen.getByRole('link', { name: 'View journey' })).toHaveAttribute('href', JOURNEY_PATH)
  })

  it('reads the change from the journey detail query, so a reload of the URL works', async () => {
    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Delay published at 07:12' })
    expect(getJourney).toHaveBeenCalledWith(JOURNEY_ID)
  })

  it('does not show a delivery-by-channel section, because no endpoint reports delivery', async () => {
    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Delay published at 07:12' })
    expect(screen.queryByText(/Delivery by channel/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Delivered|Sending|Retrying/)).not.toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('shows a not-found state for a change that is not in the history', async () => {
    renderPage('c-unknown')

    expect(await screen.findByRole('heading', { name: 'Change not found' })).toBeInTheDocument()
  })

  it('shows the journey-not-found state for a 404 from the API', async () => {
    vi.mocked(getJourney).mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'No such journey.'))
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Journey not found' })).toBeInTheDocument()
  })

  it('sends a forbidden read to the existing forbidden page', async () => {
    vi.mocked(getJourney).mockRejectedValue(new ApiError(403, 'FORBIDDEN_ROLE', 'Not your role.'))
    renderPage()

    expect(await screen.findByRole('heading', { name: "You don't have access to this page" })).toBeInTheDocument()
  })
})
