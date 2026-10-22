import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/app/providers/AuthContext'
import { getJourney } from '@/features/journeys/api/journeys'
import JourneyDetailPage from '@/features/journeys/pages/JourneyDetailPage'
import type { JourneyDetail } from '@/features/journeys/types'
import { getStations } from '@/features/stations/api/stations'
import type { Station } from '@/features/stations/types'
import { publishPlatformChange } from '../api/publish'
import type { PublishedChange } from '../types'
import PublishPlatformChangePage from './PublishPlatformChangePage'

vi.mock('../api/publish')
vi.mock('@/features/journeys/api/journeys')
vi.mock('@/features/stations/api/stations')

const JOURNEY_ID = '0196f2a0-0000-7000-8000-000000000001'
const JOURNEY_PATH = `/journeys/${JOURNEY_ID}`

const controller: AuthContextValue = {
  currentUser: { id: 'dev-network_controller', displayName: 'Dev Network Controller', role: 'network_controller' },
  isLoading: false,
  login: vi.fn(),
  logout: vi.fn(),
}

const stations: Station[] = [
  {
    id: 'st-kandy',
    code: 'KDY',
    name: 'Kandy',
    isInterchange: true,
    platforms: [
      { id: 'pl-kandy-2', stationId: 'st-kandy', number: '2' },
      { id: 'pl-kandy-3', stationId: 'st-kandy', number: '3' },
    ],
    lines: [],
  },
]

const detail: JourneyDetail = {
  id: JOURNEY_ID,
  serviceName: 'Kandy Express',
  lineCode: 'KDY',
  lineName: 'Main Line',
  direction: 'outbound',
  scheduledDepartureAt: '2026-10-21T02:30:00Z',
  status: 'scheduled',
  serviceDate: '2026-10-21',
  stops: [
    {
      sequence: 2,
      stationId: 'st-kandy',
      isCalling: true,
      scheduledArrival: null,
      scheduledDeparture: '2026-10-21T02:30:00Z',
      platformId: 'pl-kandy-2',
    },
  ],
}

const publishedChange: PublishedChange = {
  id: '0196f2a0-0000-7000-8000-0000000000c3',
  type: 'platform_change',
  journeyId: JOURNEY_ID,
  values: { sequence: 2, platformId: 'pl-kandy-3' },
  publishedBy: 'Dev Network Controller',
  publishedAt: '2026-10-21T02:40:00Z',
  provenance: 'automatically_published',
  correctedByChangeId: null,
  correctsChangeId: null,
}

function renderPlatformPage() {
  const router = createMemoryRouter(
    [
      { path: '/journeys/:journeyId', element: <JourneyDetailPage /> },
      { path: '/journeys/:journeyId/publish/platform-change', element: <PublishPlatformChangePage /> },
    ],
    { initialEntries: [`${JOURNEY_PATH}/publish/platform-change?date=2026-10-21`] },
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={controller}>
        <RouterProvider router={router} />
      </AuthContext.Provider>
    </QueryClientProvider>,
  )

  return router
}

describe('PublishPlatformChangePage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('VITE_USE_REAL_OPERATIONS', undefined)
    vi.mocked(getJourney).mockResolvedValue(detail)
    vi.mocked(getStations).mockResolvedValue(stations)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('publishes the platform change after the dialog confirms it, then returns with the status', async () => {
    const user = userEvent.setup()
    vi.mocked(publishPlatformChange).mockResolvedValue(publishedChange)
    const router = renderPlatformPage()

    await user.selectOptions(await screen.findByLabelText('Stop whose platform changes'), 'Stop 2: Kandy')
    await user.selectOptions(screen.getByLabelText('New platform'), 'Platform 3')
    await user.click(screen.getByRole('button', { name: 'Review platform change' }))

    const dialog = await screen.findByRole('dialog', { name: 'Publish this platform change?' })
    expect(
      within(dialog).getByText('Stop 2: Kandy moves from platform 2 to platform 3.'),
    ).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Publish platform change' }))

    expect(publishPlatformChange).toHaveBeenCalledWith(JOURNEY_ID, { sequence: 2, platformId: 'pl-kandy-3' })
    expect(await screen.findByRole('status')).toHaveTextContent('Platform change published at 08:10')
    expect(router.state.location.pathname).toBe(JOURNEY_PATH)
  })
})
