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
import { publishTermination } from '../api/publish'
import type { PublishedChange } from '../types'
import PublishTerminationPage from './PublishTerminationPage'
import PublishedChangePage from './PublishedChangePage'

vi.mock('../api/publish')
vi.mock('@/features/journeys/api/journeys')
vi.mock('@/features/stations/api/stations')

const JOURNEY_ID = '0196f2a0-0000-7000-8000-000000000001'
const JOURNEY_PATH = `/journeys/${JOURNEY_ID}`
const PUBLISH_PATH = `${JOURNEY_PATH}/publish/termination`

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
    platforms: [{ id: 'pl-kandy-2', stationId: 'st-kandy', number: '2' }],
    lines: [],
  },
  { id: 'st-galle', code: 'GLE', name: 'Galle', isInterchange: false, platforms: [], lines: [] },
]

const publishedChange: PublishedChange = {
  id: '0196f2a0-0000-7000-8000-0000000000c4',
  type: 'termination',
  values: { lastStopSequence: '2' },
  publisherName: 'Dev Network Controller',
  // 02:40Z is 08:10 on the railway clock.
  publishedAt: '2026-10-28T02:40:00Z',
  provenance: 'automatically_published',
  corrected: false,
}

// Stop 1 has departed; stop 3 is the final calling stop. Only stop 2 is an early termination.
const detail: JourneyDetail = {
  id: JOURNEY_ID,
  serviceName: 'Kandy Express',
  lineCode: 'KDY',
  lineName: 'Main Line',
  direction: 'outbound',
  status: 'running',
  delayMinutes: null,
  lastDepartedStation: { id: 'st-kandy', name: 'Kandy' },
  nextStation: { id: 'st-galle', name: 'Galle' },
  guardName: 'Nimal Perera',
  lastUpdatedAt: '2026-10-28T02:35:00Z',
  isStale: false,
  stops: [
    {
      sequence: 1,
      stationId: 'st-kandy',
      stationName: 'Kandy',
      isCalling: true,
      scheduledArrival: null,
      scheduledDeparture: '2026-10-28T02:30:00Z',
      expectedArrival: null,
      expectedDeparture: '2026-10-28T02:30:00Z',
      actualDeparture: '2026-10-28T02:31:00Z',
      platformId: 'pl-kandy-2',
      platformNumber: '2',
    },
    {
      sequence: 2,
      stationId: 'st-galle',
      stationName: 'Galle',
      isCalling: true,
      scheduledArrival: '2026-10-28T02:50:00Z',
      scheduledDeparture: '2026-10-28T02:51:00Z',
      expectedArrival: '2026-10-28T02:50:00Z',
      expectedDeparture: '2026-10-28T02:51:00Z',
      actualDeparture: null,
      platformId: null,
      platformNumber: null,
    },
    {
      sequence: 3,
      stationId: 'st-kandy',
      stationName: 'Kandy',
      isCalling: true,
      scheduledArrival: '2026-10-28T03:10:00Z',
      scheduledDeparture: null,
      expectedArrival: '2026-10-28T03:10:00Z',
      expectedDeparture: null,
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
          { path: 'publish/termination', element: <PublishTerminationPage /> },
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

async function chooseLastStop(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(await screen.findByLabelText('Last stop served'), 'Stop 2: Galle')
}

describe('PublishTerminationPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getJourney).mockResolvedValue(detail)
    vi.mocked(getStations).mockResolvedValue(stations)
  })

  it('opens the early-termination drawer from its route', async () => {
    renderPage()

    const drawer = await screen.findByRole('dialog', { name: 'Early termination' })
    expect(await within(drawer).findByText('Kandy Express · Main Line')).toBeInTheDocument()
  })

  it('offers calling stops after the last departure, never the final calling stop', async () => {
    renderPage()

    const select = await screen.findByLabelText('Last stop served')
    expect(within(select).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Choose a stop',
      'Stop 2: Galle',
    ])
  })

  it('lists the stops that will not be served once a last stop is chosen', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('dialog', { name: 'Early termination' })
    await screen.findByLabelText('Last stop served')
    expect(screen.getByText(/Choose the last stop served to see which stops are no longer served/)).toBeInTheDocument()

    await chooseLastStop(user)

    const table = screen.getByRole('table', { name: /Stops after the last stop served/ })
    expect(within(table).getByText('Stop 3: Kandy')).toBeInTheDocument()
    expect(within(table).getByText('08:40')).toBeInTheDocument()
    expect(within(table).getByText('Not served')).toBeInTheDocument()
    expect(within(table).queryByText('Stop 2: Galle')).not.toBeInTheDocument()
  })

  it('shows the review dialog with the stops no longer served and the audiences', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('dialog', { name: 'Early termination' })
    await chooseLastStop(user)
    await user.click(screen.getByRole('button', { name: 'Review termination' }))

    const dialog = await screen.findByRole('dialog', { name: 'Publish this early termination?' })
    expect(
      within(dialog).getByText('Kandy Express will end its journey at Stop 2: Galle.'),
    ).toBeInTheDocument()
    expect(within(dialog).getByText('No longer served:')).toBeInTheDocument()
    expect(within(dialog).getByText('Stop 3: Kandy')).toBeInTheDocument()
    expect(within(dialog).getByText('This reaches:')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Confirm early termination' }).className).toMatch(/danger/)
  })

  it('posts the termination body and navigates to the published confirmation', async () => {
    const user = userEvent.setup()
    vi.mocked(publishTermination).mockResolvedValue(publishedChange)
    const router = renderPage()

    await screen.findByRole('dialog', { name: 'Early termination' })
    await chooseLastStop(user)
    await user.click(screen.getByRole('button', { name: 'Review termination' }))
    await user.click(await screen.findByRole('button', { name: 'Confirm early termination' }))

    expect(publishTermination).toHaveBeenCalledWith(JOURNEY_ID, { lastStopSequence: 2 })
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Early termination published at 08:10' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`${JOURNEY_PATH}/published/${publishedChange.id}`)
  })

  it('keeps the review dialog open with the server message when publishing fails', async () => {
    const user = userEvent.setup()
    vi.mocked(publishTermination).mockRejectedValue(new ApiError(409, 'CONFLICT', 'Stop 2 has already departed.'))
    renderPage()

    await screen.findByRole('dialog', { name: 'Early termination' })
    await chooseLastStop(user)
    await user.click(screen.getByRole('button', { name: 'Review termination' }))
    const dialog = await screen.findByRole('dialog', { name: 'Publish this early termination?' })
    await user.click(within(dialog).getByRole('button', { name: 'Confirm early termination' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Stop 2 has already departed.')
    expect(screen.getByLabelText('Last stop served')).toHaveValue('2')
  })

  it('shows the not-found state for a journey that does not exist', async () => {
    vi.mocked(getJourney).mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'No such journey.'))
    renderPage()

    expect((await screen.findAllByRole('heading', { name: 'Journey not found' })).length).toBeGreaterThan(0)
    expect(screen.queryByLabelText('Last stop served')).not.toBeInTheDocument()
  })
})
