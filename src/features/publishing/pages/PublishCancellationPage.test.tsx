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
import { ApiError } from '@/shared/api/ApiError'
import { publishCancellation } from '../api/publish'
import type { PublishedChange } from '../types'
import PublishCancellationPage from './PublishCancellationPage'
import PublishedChangePage from './PublishedChangePage'

vi.mock('../api/publish')
vi.mock('@/features/journeys/api/journeys')
vi.mock('@/features/stations/api/stations')

const JOURNEY_ID = '0196f2a0-0000-7000-8000-000000000001'
const JOURNEY_PATH = `/journeys/${JOURNEY_ID}`
const PUBLISH_PATH = `${JOURNEY_PATH}/publish/cancellation`

const controller: AuthContextValue = {
  currentUser: { id: 'dev-network_controller', displayName: 'Dev Network Controller', role: 'network_controller' },
  isSignedIn: true,
  isLoading: false,
  signIn: vi.fn(),
  completeSignIn: vi.fn(),
  logout: vi.fn(),
}

const publishedChange: PublishedChange = {
  id: '0196f2a0-0000-7000-8000-0000000000c2',
  type: 'cancellation',
  values: {},
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
      sequence: 1,
      stationId: 'st-1',
      stationName: 'Kandy',
      isCalling: true,
      scheduledArrival: null,
      scheduledDeparture: '2026-10-28T02:00:00Z',
      expectedArrival: null,
      expectedDeparture: '2026-10-28T02:00:00Z',
      actualDeparture: null,
      platformId: null,
      platformNumber: null,
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
          { path: 'publish/cancellation', element: <PublishCancellationPage /> },
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

describe('PublishCancellationPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getJourney).mockResolvedValue(detail)
    vi.mocked(getStations).mockResolvedValue([])
  })

  it('opens the cancellation drawer from its route with the warning and audiences', async () => {
    renderPage()

    const drawer = await screen.findByRole('dialog', { name: 'Cancel journey' })
    expect(await within(drawer).findByRole('heading', { name: 'Cancel Kandy Express?' })).toBeInTheDocument()
    expect(within(drawer).getByText(/Kandy Express departs 07:30 and has not left yet/)).toBeInTheDocument()
    expect(within(drawer).getByText('This cannot be undone.')).toBeInTheDocument()
    expect(within(drawer).getByText('This cancellation reaches')).toBeInTheDocument()
    expect(within(drawer).getByText('Passenger app')).toBeInTheDocument()
    expect(
      within(drawer).getByText('Published immediately by Dev Network Controller. A mistake is fixed with a correction.'),
    ).toBeInTheDocument()
  })

  it('confirms with a danger button and posts a cancellation with no body', async () => {
    const user = userEvent.setup()
    vi.mocked(publishCancellation).mockResolvedValue(publishedChange)
    const router = renderPage()

    await screen.findByRole('dialog', { name: 'Cancel journey' })
    await screen.findByRole('heading', { name: 'Cancel Kandy Express?' })
    await user.click(screen.getByRole('button', { name: 'Review cancellation' }))

    const dialog = await screen.findByRole('dialog', { name: 'Cancel this journey?' })
    expect(
      within(dialog).getByText('Kandy Express (07:30) will be cancelled. A journey that has departed cannot be cancelled.'),
    ).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Confirm cancellation' }).className).toMatch(/danger/)

    await user.click(within(dialog).getByRole('button', { name: 'Confirm cancellation' }))

    expect(publishCancellation).toHaveBeenCalledWith(JOURNEY_ID)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Cancellation published at 08:10' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`${JOURNEY_PATH}/published/${publishedChange.id}`)
  })

  it('keeps the review dialog open with the API detail when the journey cannot be found', async () => {
    const user = userEvent.setup()
    vi.mocked(publishCancellation).mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'No such journey.'))
    renderPage()

    await screen.findByRole('dialog', { name: 'Cancel journey' })
    await screen.findByRole('heading', { name: 'Cancel Kandy Express?' })
    await user.click(screen.getByRole('button', { name: 'Review cancellation' }))
    const dialog = await screen.findByRole('dialog', { name: 'Cancel this journey?' })
    await user.click(within(dialog).getByRole('button', { name: 'Confirm cancellation' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('No such journey.')
    expect(screen.getByRole('dialog', { name: 'Cancel this journey?' })).toBeInTheDocument()
  })

  it('closes the drawer without publishing when the user goes back', async () => {
    const user = userEvent.setup()
    const router = renderPage()

    await screen.findByRole('dialog', { name: 'Cancel journey' })
    await user.click(screen.getByRole('button', { name: 'Go back' }))

    expect(screen.queryByRole('dialog', { name: 'Cancel journey' })).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe(JOURNEY_PATH)
    expect(publishCancellation).not.toHaveBeenCalled()
  })
})
