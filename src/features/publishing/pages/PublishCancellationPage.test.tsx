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
import { ApiError } from '@/shared/api/ApiError'
import { publishCancellation } from '../api/publish'
import type { PublishedChange } from '../types'
import PublishCancellationPage from './PublishCancellationPage'

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

const detail: JourneyDetail = {
  id: JOURNEY_ID,
  serviceName: 'Kandy Express',
  lineCode: 'KDY',
  lineName: 'Main Line',
  direction: 'outbound',
  scheduledDepartureAt: '2026-10-21T02:30:00Z',
  status: 'scheduled',
  serviceDate: '2026-10-21',
  stops: [],
}

const publishedChange: PublishedChange = {
  id: '0196f2a0-0000-7000-8000-0000000000c2',
  type: 'cancellation',
  journeyId: JOURNEY_ID,
  values: {},
  publishedBy: 'Dev Network Controller',
  publishedAt: '2026-10-21T02:40:00Z',
  provenance: 'automatically_published',
  correctedByChangeId: null,
  correctsChangeId: null,
}

function renderCancellationPage() {
  const router = createMemoryRouter(
    [
      { path: '/journeys/:journeyId', element: <JourneyDetailPage /> },
      { path: '/journeys/:journeyId/publish/cancellation', element: <PublishCancellationPage /> },
    ],
    { initialEntries: [`${JOURNEY_PATH}/publish/cancellation?date=2026-10-21`] },
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
    vi.stubEnv('VITE_USE_REAL_OPERATIONS', undefined)
    vi.mocked(getJourney).mockResolvedValue(detail)
    vi.mocked(getStations).mockResolvedValue([])
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('confirms with a danger button, then returns to the journey with the cancellation status', async () => {
    const user = userEvent.setup()
    vi.mocked(publishCancellation).mockResolvedValue(publishedChange)
    const router = renderCancellationPage()

    await user.click(await screen.findByRole('button', { name: 'Review cancellation' }))

    const dialog = await screen.findByRole('dialog', { name: 'Cancel this journey?' })
    expect(within(dialog).getByRole('button', { name: 'Cancel journey' }).className).toMatch(/danger/)
    expect(within(dialog).getByText(/Automatically published/)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Cancel journey' }))

    expect(publishCancellation).toHaveBeenCalledWith(JOURNEY_ID)
    expect(await screen.findByRole('status')).toHaveTextContent('Cancellation published at 08:10')
    expect(router.state.location.pathname).toBe(JOURNEY_PATH)
  })

  it('keeps the dialog open with the mapped message when the journey cannot be found', async () => {
    const user = userEvent.setup()
    vi.mocked(publishCancellation).mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'No such journey.'))
    renderCancellationPage()

    await user.click(await screen.findByRole('button', { name: 'Review cancellation' }))
    const dialog = await screen.findByRole('dialog', { name: 'Cancel this journey?' })
    await user.click(within(dialog).getByRole('button', { name: 'Cancel journey' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('This journey could not be found.')
    expect(screen.getByRole('dialog', { name: 'Cancel this journey?' })).toBeInTheDocument()
  })
})
