import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/app/providers/AuthContext'
import { getJourney } from '@/features/journeys/api/journeys'
import JourneyDetailPage from '@/features/journeys/pages/JourneyDetailPage'
import type { JourneyDetail } from '@/features/journeys/types'
import { getStations } from '@/features/stations/api/stations'
import type { Station } from '@/features/stations/types'
import { ApiError } from '@/shared/api/ApiError'
import { publishPlatformChange } from '../api/publish'
import type { PublishedChange } from '../types'
import PublishPlatformChangePage from './PublishPlatformChangePage'
import PublishedChangePage from './PublishedChangePage'

vi.mock('../api/publish')
vi.mock('@/features/journeys/api/journeys')
vi.mock('@/features/stations/api/stations')

const JOURNEY_ID = '0196f2a0-0000-7000-8000-000000000001'
const JOURNEY_PATH = `/journeys/${JOURNEY_ID}`
const PUBLISH_PATH = `${JOURNEY_PATH}/publish/platform-change`

const controller: AuthContextValue = {
  currentUser: { id: 'dev-network_controller', displayName: 'Dev Network Controller', role: 'network_controller' },
  isSignedIn: true,
  isLoading: false,
  signIn: vi.fn(),
  completeSignIn: vi.fn(),
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

const publishedChange: PublishedChange = {
  id: '0196f2a0-0000-7000-8000-0000000000c3',
  type: 'platform_change',
  values: { stopSequence: '2', platformId: 'pl-kandy-3' },
  publisherName: 'Dev Network Controller',
  // 02:40Z is 08:10 on the railway clock.
  publishedAt: '2026-10-28T02:40:00Z',
  provenance: 'automatically_published',
  corrected: false,
}

const detail: JourneyDetail = {
  id: JOURNEY_ID,
  serviceName: 'Kandy Express',
  lineCode: 'KDY',
  lineName: 'Main Line',
  direction: 'outbound',
  status: 'scheduled',
  delayMinutes: null,
  lastDepartedStation: null,
  nextStation: null,
  guardName: null,
  lastUpdatedAt: '2026-10-28T02:30:00Z',
  isStale: false,
  stops: [
    {
      sequence: 2,
      stationId: 'st-kandy',
      stationName: 'Kandy',
      isCalling: true,
      scheduledArrival: null,
      scheduledDeparture: '2026-10-28T02:30:00Z',
      expectedArrival: null,
      expectedDeparture: '2026-10-28T02:30:00Z',
      actualDeparture: null,
      platformId: 'pl-kandy-2',
      platformNumber: '2',
    },
  ],
  changes: [publishedChange],
}

function renderPage() {
  const router = createMemoryRouter(
    [
      {
        path: '/journeys/:journeyId',
        element: <JourneyDetailPage />,
        children: [
          { path: 'publish/platform-change', element: <PublishPlatformChangePage /> },
          { path: 'published/:changeId', element: <PublishedChangePage /> },
        ],
      },
    ],
    { initialEntries: [PUBLISH_PATH] },
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

async function choosePlatform(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(await screen.findByLabelText('Stop whose platform changes'), 'Stop 2: Kandy')
  await user.selectOptions(screen.getByLabelText('New platform'), 'Platform 3')
}

describe('PublishPlatformChangePage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getJourney).mockResolvedValue(detail)
    vi.mocked(getStations).mockResolvedValue(stations)
  })

  it('opens the platform drawer from its route, with the journey behind it', async () => {
    renderPage()

    const drawer = await screen.findByRole('dialog', { name: 'Change a platform' })
    expect(await within(drawer).findByText('Kandy Express · Main Line')).toBeInTheDocument()
    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
  })

  it("offers only the chosen stop's station platforms and shows the current one", async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('dialog', { name: 'Change a platform' })
    const platformSelect = await screen.findByLabelText('New platform')
    expect(platformSelect).toBeDisabled()

    await user.selectOptions(screen.getByLabelText('Stop whose platform changes'), 'Stop 2: Kandy')
    expect(platformSelect).toBeEnabled()
    expect(within(platformSelect).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Choose a platform',
      'Platform 2 (current)',
      'Platform 3',
    ])
    expect(screen.getByText('Currently platform 2.')).toBeInTheDocument()
    expect(screen.getByText("Only this station's platforms are offered below.")).toBeInTheDocument()
  })

  it('refuses the current platform with a field error', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('dialog', { name: 'Change a platform' })
    await user.selectOptions(await screen.findByLabelText('Stop whose platform changes'), 'Stop 2: Kandy')
    await user.selectOptions(screen.getByLabelText('New platform'), 'Platform 2 (current)')
    await user.tab()

    expect(screen.getByText('Choose a platform different from the current one.')).toBeInTheDocument()
  })

  it('posts the platform change body and navigates to the published confirmation', async () => {
    const user = userEvent.setup()
    vi.mocked(publishPlatformChange).mockResolvedValue(publishedChange)
    const router = renderPage()

    await screen.findByRole('dialog', { name: 'Change a platform' })
    await choosePlatform(user)
    await user.click(screen.getByRole('button', { name: 'Review platform change' }))

    const dialog = await screen.findByRole('dialog', { name: 'Publish this platform change?' })
    expect(
      within(dialog).getByText('Stop 2: Kandy moves from platform 2 to platform 3 on Kandy Express.'),
    ).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Confirm platform change' }))

    expect(publishPlatformChange).toHaveBeenCalledWith(JOURNEY_ID, { sequence: 2, platformId: 'pl-kandy-3' })
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Platform change published at 08:10' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`${JOURNEY_PATH}/published/${publishedChange.id}`)
  })

  it('keeps the review dialog open with the API detail when the stop has already departed', async () => {
    const user = userEvent.setup()
    vi.mocked(publishPlatformChange).mockRejectedValue(
      new ApiError(409, 'CONFLICT', 'Stop 2 has already departed.'),
    )
    renderPage()

    await screen.findByRole('dialog', { name: 'Change a platform' })
    await choosePlatform(user)
    await user.click(screen.getByRole('button', { name: 'Review platform change' }))
    const dialog = await screen.findByRole('dialog', { name: 'Publish this platform change?' })
    await user.click(within(dialog).getByRole('button', { name: 'Confirm platform change' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Stop 2 has already departed.')
    expect(screen.getByRole('dialog', { name: 'Publish this platform change?' })).toBeInTheDocument()
  })

  it('shows the not-found state for a journey that does not exist', async () => {
    vi.mocked(getJourney).mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'No such journey.'))
    renderPage()

    expect((await screen.findAllByRole('heading', { name: 'Journey not found' })).length).toBeGreaterThan(0)
    expect(screen.queryByLabelText('New platform')).not.toBeInTheDocument()
  })
})
