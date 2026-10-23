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
import { publishTermination } from '../api/publish'
import { MOCK_NOTE } from '../lib/mockNote'
import type { PublishedChange } from '../types'
import PublishTerminationPage from './PublishTerminationPage'

vi.mock('../api/publish')
vi.mock('@/features/journeys/api/journeys')
vi.mock('@/features/stations/api/stations')

const JOURNEY_ID = '0196f2a0-0000-7000-8000-000000000001'
const JOURNEY_PATH = `/journeys/${JOURNEY_ID}`
const PUBLISH_PATH = `${JOURNEY_PATH}/publish/termination?date=2026-10-21`
const JOURNEY_ROUTE = '/journeys/:journeyId'
const PUBLISH_ROUTE = '/journeys/:journeyId/publish/termination'

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

// Three calling stops: the final one (stop 3) must not be offered, because ending there is not early.
const detail: JourneyDetail = {
  id: JOURNEY_ID,
  serviceName: 'Kandy Express',
  lineCode: 'KDY',
  lineName: 'Main Line',
  direction: 'outbound',
  scheduledDepartureAt: '2026-10-21T02:30:00Z',
  status: 'running',
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
    {
      sequence: 3,
      stationId: 'st-kandy',
      isCalling: true,
      scheduledArrival: '2026-10-21T03:10:00Z',
      scheduledDeparture: null,
      platformId: 'pl-kandy-2',
    },
  ],
}

// 02:40Z is 08:10 on the railway clock, the time the status message shows.
const publishedChange: PublishedChange = {
  id: '0196f2a0-0000-7000-8000-0000000000c4',
  type: 'termination',
  journeyId: JOURNEY_ID,
  values: { lastStopSequence: 2 },
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
      { path: PUBLISH_ROUTE, element: <PublishTerminationPage /> },
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

async function chooseLastStop(user: ReturnType<typeof userEvent.setup>, option: string) {
  await user.selectOptions(await screen.findByLabelText('Last stop served'), option)
  await user.click(screen.getByRole('button', { name: 'Review termination' }))
}

describe('PublishTerminationPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('VITE_USE_REAL_OPERATIONS', undefined)
    vi.mocked(getJourney).mockResolvedValue(detail)
    vi.mocked(getStations).mockResolvedValue(stations)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('offers only the calling stops before the final one, labelled with station names', async () => {
    renderPublishPage()

    const select = await screen.findByLabelText('Last stop served')
    const options = within(select)
      .getAllByRole('option')
      .map((option) => option.textContent)
    expect(options).toEqual(['Choose a stop', 'Stop 1: Kandy', 'Stop 2: Galle'])
  })

  it('terminates the journey after the dialog confirms it, then returns to the journey with the status', async () => {
    const user = userEvent.setup()
    vi.mocked(publishTermination).mockResolvedValue(publishedChange)
    const router = renderPublishPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'Publish an early termination' })).toBeInTheDocument()
    await chooseLastStop(user, 'Stop 2: Galle')

    const dialog = await screen.findByRole('dialog', { name: 'Publish this early termination?' })
    expect(
      within(dialog).getByText(
        'The train ends its journey after Stop 2: Galle. Later stops are no longer served.',
      ),
    ).toBeInTheDocument()
    expect(within(dialog).getByText(/Published by Dev Network Controller/)).toBeInTheDocument()
    expect(within(dialog).getByText(/Cannot be undone/)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Publish termination' }))

    expect(publishTermination).toHaveBeenCalledWith(JOURNEY_ID, { lastStopSequence: 2 })
    expect(await screen.findByRole('status')).toHaveTextContent('Early termination published at 08:10')
    expect(screen.getByRole('heading', { level: 1, name: 'Kandy Express' })).toBeInTheDocument()
    expect(screen.queryByText('Leave without publishing?')).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe(JOURNEY_PATH)
    expect(router.state.location.search).toBe('?date=2026-10-21')
  })

  it('keeps the dialog open with the server message and keeps the chosen stop when publishing fails', async () => {
    const user = userEvent.setup()
    vi.mocked(publishTermination).mockRejectedValue(new ApiError(409, 'CONFLICT', 'Stop 2 has already departed.'))
    renderPublishPage()

    await screen.findByRole('heading', { level: 1, name: 'Publish an early termination' })
    await chooseLastStop(user, 'Stop 2: Galle')
    const dialog = await screen.findByRole('dialog', { name: 'Publish this early termination?' })
    await user.click(within(dialog).getByRole('button', { name: 'Publish termination' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Stop 2 has already departed.')
    expect(screen.getByRole('dialog', { name: 'Publish this early termination?' })).toBeInTheDocument()
    expect(screen.getByLabelText('Last stop served')).toHaveValue('2')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows the generic message when publishing fails for a reason other than a conflict', async () => {
    const user = userEvent.setup()
    vi.mocked(publishTermination).mockRejectedValue(new ApiError(500, 'UNKNOWN', 'Boom.'))
    renderPublishPage()

    await screen.findByRole('heading', { level: 1, name: 'Publish an early termination' })
    await chooseLastStop(user, 'Stop 1: Kandy')
    const dialog = await screen.findByRole('dialog', { name: 'Publish this early termination?' })
    await user.click(within(dialog).getByRole('button', { name: 'Publish termination' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'The change could not be published. Please try again.',
    )
  })

  it('closes the dialog without publishing when the user cancels it', async () => {
    const user = userEvent.setup()
    renderPublishPage()

    await screen.findByRole('heading', { level: 1, name: 'Publish an early termination' })
    await chooseLastStop(user, 'Stop 2: Galle')
    const dialog = await screen.findByRole('dialog', { name: 'Publish this early termination?' })
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog', { name: 'Publish this early termination?' })).not.toBeInTheDocument()
    expect(publishTermination).not.toHaveBeenCalled()
  })

  it('asks before leaving with an unpublished choice, and stays when the user chooses to stay', async () => {
    const user = userEvent.setup()
    const router = renderPublishPage()

    await screen.findByRole('heading', { level: 1, name: 'Publish an early termination' })
    await user.selectOptions(await screen.findByLabelText('Last stop served'), 'Stop 1: Kandy')
    await user.click(screen.getByRole('link', { name: 'Back to the journey' }))

    const dialog = await screen.findByRole('dialog', { name: 'Leave without publishing?' })
    await user.click(within(dialog).getByRole('button', { name: 'Stay on this page' }))

    expect(screen.queryByRole('dialog', { name: 'Leave without publishing?' })).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`${JOURNEY_PATH}/publish/termination`)
    expect(screen.getByLabelText('Last stop served')).toHaveValue('1')
  })

  it('says the change is a development mock while the operations group is mocked', async () => {
    renderPublishPage()

    expect(await screen.findByText(MOCK_NOTE)).toBeInTheDocument()
  })

  it('shows the not-found state for a journey that does not exist', async () => {
    vi.mocked(getJourney).mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'No such journey.'))
    renderPublishPage()

    expect(await screen.findByRole('heading', { name: 'Journey not found' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Last stop served')).not.toBeInTheDocument()
  })
})
