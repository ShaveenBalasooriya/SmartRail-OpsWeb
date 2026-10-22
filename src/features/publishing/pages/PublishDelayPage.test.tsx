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
import { ApiError } from '@/shared/api/ApiError'
import { publishDelay } from '../api/publish'
import type { PublishedChange } from '../types'
import PublishDelayPage from './PublishDelayPage'

vi.mock('../api/publish')
vi.mock('@/features/journeys/api/journeys')
vi.mock('@/features/stations/api/stations')

const JOURNEY_ID = '0196f2a0-0000-7000-8000-000000000001'
const JOURNEY_PATH = `/journeys/${JOURNEY_ID}`
const PUBLISH_PATH = `${JOURNEY_PATH}/publish/delay?date=2026-10-21`
const JOURNEY_ROUTE = '/journeys/:journeyId'
const PUBLISH_ROUTE = '/journeys/:journeyId/publish/delay'

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
    platforms: [{ id: 'pl-kandy-2', stationId: 'st-kandy', number: '2' }],
    lines: [],
  },
  { id: 'st-galle', code: 'GLE', name: 'Galle', isInterchange: false, platforms: [], lines: [] },
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
      sequence: 1,
      stationId: 'st-kandy',
      isCalling: true,
      scheduledArrival: null,
      scheduledDeparture: '2026-10-21T02:30:00Z',
      platformId: 'pl-kandy-2',
    },
    {
      sequence: 2,
      stationId: 'st-galle',
      isCalling: true,
      scheduledArrival: '2026-10-21T02:50:00Z',
      scheduledDeparture: '2026-10-21T02:51:00Z',
      platformId: null,
    },
  ],
}

// 02:40Z is 08:10 on the railway clock, the time the status message shows.
const publishedChange: PublishedChange = {
  id: '0196f2a0-0000-7000-8000-0000000000c1',
  type: 'delay',
  journeyId: JOURNEY_ID,
  values: { fromSequence: 2, minutes: 15 },
  publishedBy: 'Dev Network Controller',
  publishedAt: '2026-10-21T02:40:00Z',
  provenance: 'automatically_published',
  correctedByChangeId: null,
  correctsChangeId: null,
}

function renderPublishPage(path = PUBLISH_PATH) {
  const router = createMemoryRouter(
    [
      { path: JOURNEY_ROUTE, element: <JourneyDetailPage /> },
      { path: PUBLISH_ROUTE, element: <PublishDelayPage /> },
    ],
    { initialEntries: [path] },
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

async function fillValidDelay(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(await screen.findByLabelText('Delay starts at stop'), 'Stop 2: Galle')
  await user.type(screen.getByLabelText('Delay in minutes'), '15')
  await user.click(screen.getByRole('button', { name: 'Review delay' }))
}

describe('PublishDelayPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('VITE_USE_REAL_OPERATIONS', undefined)
    vi.mocked(getJourney).mockResolvedValue(detail)
    vi.mocked(getStations).mockResolvedValue(stations)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('publishes a delay after the dialog confirms it, then returns to the journey with the status', async () => {
    const user = userEvent.setup()
    vi.mocked(publishDelay).mockResolvedValue(publishedChange)
    const router = renderPublishPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'Publish a delay' })).toBeInTheDocument()
    await fillValidDelay(user)

    const dialog = await screen.findByRole('dialog', { name: 'Publish this delay?' })
    expect(within(dialog).getByText('Delay of 15 minutes from Stop 2: Galle.')).toBeInTheDocument()
    expect(within(dialog).getByText(/Published by Dev Network Controller/)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Publish delay' }))

    expect(publishDelay).toHaveBeenCalledWith(JOURNEY_ID, { fromSequence: 2, minutes: 15 })
    expect(await screen.findByRole('status')).toHaveTextContent('Delay published at 08:10')
    expect(screen.getByRole('heading', { level: 1, name: 'Kandy Express' })).toBeInTheDocument()
    expect(screen.queryByText('Leave without publishing?')).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe(JOURNEY_PATH)
    expect(router.state.location.search).toBe('?date=2026-10-21')
  })

  it('keeps the dialog open with the server message and keeps the typed values when publishing fails', async () => {
    const user = userEvent.setup()
    vi.mocked(publishDelay).mockRejectedValue(new ApiError(409, 'CONFLICT', 'Stop 2 has already departed.'))
    renderPublishPage()

    await screen.findByRole('heading', { level: 1, name: 'Publish a delay' })
    await fillValidDelay(user)
    const dialog = await screen.findByRole('dialog', { name: 'Publish this delay?' })
    await user.click(within(dialog).getByRole('button', { name: 'Publish delay' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Stop 2 has already departed.')
    expect(screen.getByRole('dialog', { name: 'Publish this delay?' })).toBeInTheDocument()
    expect(screen.getByLabelText('Delay in minutes')).toHaveValue('15')
    expect(screen.getByLabelText('Delay starts at stop')).toHaveValue('2')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('closes the dialog without publishing when the user cancels it', async () => {
    const user = userEvent.setup()
    renderPublishPage()

    await screen.findByRole('heading', { level: 1, name: 'Publish a delay' })
    await fillValidDelay(user)
    const dialog = await screen.findByRole('dialog', { name: 'Publish this delay?' })
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog', { name: 'Publish this delay?' })).not.toBeInTheDocument()
    expect(publishDelay).not.toHaveBeenCalled()
  })

  it('asks before leaving with an unpublished change, and stays when the user chooses to stay', async () => {
    const user = userEvent.setup()
    const router = renderPublishPage()

    await screen.findByRole('heading', { level: 1, name: 'Publish a delay' })
    await user.type(await screen.findByLabelText('Delay in minutes'), '5')
    await user.click(screen.getByRole('link', { name: 'Back to the journey' }))

    const dialog = await screen.findByRole('dialog', { name: 'Leave without publishing?' })
    await user.click(within(dialog).getByRole('button', { name: 'Stay on this page' }))

    expect(screen.queryByRole('dialog', { name: 'Leave without publishing?' })).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`${JOURNEY_PATH}/publish/delay`)
    expect(screen.getByLabelText('Delay in minutes')).toHaveValue('5')
  })

  it('lets the user leave, discarding the change, when they confirm', async () => {
    const user = userEvent.setup()
    renderPublishPage()

    await screen.findByRole('heading', { level: 1, name: 'Publish a delay' })
    await user.type(await screen.findByLabelText('Delay in minutes'), '5')
    await user.click(screen.getByRole('link', { name: 'Back to the journey' }))

    const dialog = await screen.findByRole('dialog', { name: 'Leave without publishing?' })
    await user.click(within(dialog).getByRole('button', { name: 'Leave' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })).toBeInTheDocument()
    expect(publishDelay).not.toHaveBeenCalled()
  })

  it('says the change is a development mock while the operations group is mocked', async () => {
    renderPublishPage()

    expect(await screen.findByText('Development mock: this change is not sent to the API yet.')).toBeInTheDocument()
  })

  it('does not say it is a mock once the operations group is real', async () => {
    vi.stubEnv('VITE_USE_REAL_OPERATIONS', 'true')
    renderPublishPage()

    await screen.findByRole('heading', { level: 1, name: 'Publish a delay' })
    expect(screen.queryByText('Development mock: this change is not sent to the API yet.')).not.toBeInTheDocument()
  })

  it('shows the not-found state for a journey that does not exist', async () => {
    vi.mocked(getJourney).mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'No such journey.'))
    renderPublishPage()

    expect(await screen.findByRole('heading', { name: 'Journey not found' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Delay in minutes')).not.toBeInTheDocument()
  })
})
