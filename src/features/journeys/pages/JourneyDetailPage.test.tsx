import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/app/providers/AuthContext'
import type { Role } from '@/features/auth/types'
import { recordChange, resetMockChanges } from '@/features/publishing/api/mockChangeStore'
import type { PublishedChange } from '@/features/publishing/types'
import { getStations } from '@/features/stations/api/stations'
import type { Station } from '@/features/stations/types'
import { ApiError } from '@/shared/api/ApiError'
import { railwayDateKey } from '@/shared/lib/railwayTime'
import { getJourney } from '../api/journeys'
import type { JourneyDetail } from '../types'
import JourneyDetailPage from './JourneyDetailPage'

vi.mock('../api/journeys')
vi.mock('@/features/stations/api/stations')

const JOURNEY_ID = '0196f2a0-0000-7000-8000-000000000001'

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

// A change published on the journey. The values and the time are what each test varies.
function publishedOn(overrides: Partial<PublishedChange> & Pick<PublishedChange, 'id' | 'type'>): PublishedChange {
  return {
    journeyId: JOURNEY_ID,
    values: {},
    publishedBy: 'Dev Network Controller',
    publishedAt: '2026-10-21T02:40:00Z',
    provenance: 'automatically_published',
    correctedByChangeId: null,
    correctsChangeId: null,
    ...overrides,
  }
}

const detail: JourneyDetail = {
  id: JOURNEY_ID,
  serviceName: 'Kandy Express',
  lineCode: 'KDY',
  lineName: 'Main Line',
  direction: 'outbound',
  scheduledDepartureAt: '2026-10-21T02:30:00Z',
  status: null,
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
      stationId: 'st-unknown',
      isCalling: false,
      scheduledArrival: null,
      scheduledDeparture: null,
      platformId: null,
    },
  ],
}

function authFor(role: Role): AuthContextValue {
  return {
    currentUser: { id: `dev-${role}`, displayName: 'Test user', role },
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }
}

// state is the router location state a publish redirect leaves behind.
function renderPage(
  path = `/journeys/${JOURNEY_ID}?date=2026-10-21`,
  { role = 'network_controller', state }: { role?: Role; state?: unknown } = {},
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const url = new URL(path, 'http://localhost')

  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authFor(role)}>
        <MemoryRouter initialEntries={[{ pathname: url.pathname, search: url.search, state }]}>
          <Routes>
            <Route path="/journeys/:journeyId" element={<JourneyDetailPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

describe('JourneyDetailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    resetMockChanges()
    vi.mocked(getStations).mockResolvedValue(stations)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('shows a loading indicator while the journey is pending', () => {
    vi.mocked(getJourney).mockReturnValue(new Promise(() => {}))

    renderPage()

    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
    expect(screen.queryByRole('heading', { name: 'Kandy Express' })).not.toBeInTheDocument()
  })

  it('shows the error message and a retry when the journey cannot load', async () => {
    vi.mocked(getJourney).mockRejectedValue(new Error('The timetable could not load.'))

    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('The timetable could not load.')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('shows the journey-not-found state for a 404', async () => {
    vi.mocked(getJourney).mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'No such journey.'))

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Journey not found' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the service name as the h1, the facts and the stops with station names and platforms', async () => {
    vi.mocked(getJourney).mockResolvedValue(detail)

    renderPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Stops' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Stops' })).toBeInTheDocument()
    const kandyRow = screen.getByRole('row', { name: /Kandy/ })
    expect(within(kandyRow).getAllByRole('cell')[5]).toHaveTextContent('2')
    expect(screen.getByText('Kandy')).toBeInTheDocument()
    expect(screen.getByText('Unknown station')).toBeInTheDocument()
    expect(screen.getAllByText('Passes')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Back to the live board' })).toHaveAttribute('href', '/board')
  })

  it('keeps the journey on screen and shows an alert when a refresh fails', async () => {
    const user = userEvent.setup()
    vi.mocked(getJourney).mockResolvedValueOnce(detail).mockRejectedValueOnce(new Error('Network down'))

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    await user.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not refresh the journey.')
    expect(screen.getByRole('heading', { level: 1, name: 'Kandy Express' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Stops' })).toBeInTheDocument()
  })

  it('keeps rendering the stops with fallbacks and a visible note when stations fail to load', async () => {
    vi.mocked(getStations).mockRejectedValue(new Error('Stations down'))
    vi.mocked(getJourney).mockResolvedValue(detail)

    renderPage()

    expect(await screen.findByText('Station names could not be loaded.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Kandy Express' })).toBeInTheDocument()
    expect(screen.getAllByText('Unknown station')).toHaveLength(2)
  })

  it('shows "No stops listed" for a journey with no stops', async () => {
    vi.mocked(getJourney).mockResolvedValue({ ...detail, stops: [] })

    renderPage()

    expect(await screen.findByRole('heading', { name: 'No stops listed' })).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Stops' })).not.toBeInTheDocument()
  })

  it('reads the service date from the URL', async () => {
    vi.mocked(getJourney).mockResolvedValue(detail)

    renderPage(`/journeys/${JOURNEY_ID}?date=2026-10-23`)

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    expect(getJourney).toHaveBeenCalledWith(JOURNEY_ID, '2026-10-23')
  })

  it('falls back to today on the railway calendar when the date in the URL is not a day', async () => {
    vi.mocked(getJourney).mockResolvedValue(detail)

    renderPage(`/journeys/${JOURNEY_ID}?date=tomorrow`)

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    expect(getJourney).toHaveBeenCalledWith(JOURNEY_ID, railwayDateKey(new Date()))
  })

  it('offers the publish actions to a network controller, keeping the service date', async () => {
    vi.mocked(getJourney).mockResolvedValue(detail)

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    expect(screen.getByRole('heading', { level: 2, name: 'Publish a change' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Publish a delay' })).toHaveAttribute(
      'href',
      `/journeys/${JOURNEY_ID}/publish/delay?date=2026-10-21`,
    )
  })

  it('hides the publish actions from an auditor', async () => {
    vi.mocked(getJourney).mockResolvedValue(detail)

    renderPage(`/journeys/${JOURNEY_ID}?date=2026-10-21`, { role: 'auditor' })

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    expect(screen.queryByRole('heading', { name: 'Publish a change' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Publish a delay' })).not.toBeInTheDocument()
  })

  it('announces a change published just before the redirect, in railway time', async () => {
    vi.mocked(getJourney).mockResolvedValue(detail)

    renderPage(`/journeys/${JOURNEY_ID}?date=2026-10-21`, {
      state: { published: { type: 'delay', publishedAt: '2026-10-21T02:40:00Z' } },
    })

    expect(await screen.findByRole('status')).toHaveTextContent('Delay published at 08:10')
  })

  it('does not announce anything when the page is opened without a publish', async () => {
    vi.mocked(getJourney).mockResolvedValue(detail)

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows the applied status and "Not served" for a calling stop after a cancellation is published', async () => {
    recordChange(publishedOn({ id: 'c1', type: 'cancellation' }))
    vi.mocked(getJourney).mockResolvedValue(detail)

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
    expect(screen.getByText('Not served')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Publish a change' })).not.toBeInTheDocument()
  })

  it('shows the expected time after a delay, and the new platform with the time it changed', async () => {
    recordChange(publishedOn({ id: 'd1', type: 'delay', values: { fromSequence: 1, minutes: 15 } }))
    recordChange(
      publishedOn({
        id: 'p1',
        type: 'platform_change',
        values: { sequence: 1, platformId: 'pl-kandy-3' },
        publishedAt: '2026-10-21T02:50:00Z',
      }),
    )
    vi.mocked(getJourney).mockResolvedValue(detail)

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    const kandyRow = screen.getByRole('row', { name: /Kandy/ })
    const cells = within(kandyRow).getAllByRole('cell')
    expect(cells[3]).toHaveTextContent('08:00')
    expect(cells[4]).toHaveTextContent('08:15')
    expect(cells[5]).toHaveTextContent('3Changed at 08:20')
  })

  it('lists the published changes newest first, with the publisher and the railway time', async () => {
    recordChange(publishedOn({ id: 'd1', type: 'delay', values: { fromSequence: 1, minutes: 15 } }))
    recordChange(
      publishedOn({
        id: 'p1',
        type: 'platform_change',
        values: { sequence: 1, platformId: 'pl-kandy-3' },
        publishedAt: '2026-10-21T02:50:00Z',
      }),
    )
    vi.mocked(getJourney).mockResolvedValue(detail)

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    const history = screen.getByRole('region', { name: 'Change history' })
    const items = within(history).getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Platform change')
    expect(items[0]).toHaveTextContent('Stop 1 moves to platform 3')
    expect(items[0]).toHaveTextContent('Published by Dev Network Controller at 08:20')
    expect(items[1]).toHaveTextContent('Delay of 15 minutes from stop 1')
    expect(items[1]).toHaveTextContent('Automatically published')
  })

  it('says no changes were published when the journey has none', async () => {
    vi.mocked(getJourney).mockResolvedValue(detail)

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    expect(screen.getByText('No changes published')).toBeInTheDocument()
  })

  it('says the changes are a development mock while the operations group is mocked', async () => {
    vi.mocked(getJourney).mockResolvedValue(detail)

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    expect(screen.getByText(/Development mock: changes are not sent to the API yet/)).toBeInTheDocument()
  })

  it('does not read the mock store once the operations group is real, so the journey keeps its own status', async () => {
    vi.stubEnv('VITE_USE_REAL_OPERATIONS', 'true')
    recordChange(publishedOn({ id: 'c1', type: 'cancellation' }))
    vi.mocked(getJourney).mockResolvedValue(detail)

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    expect(screen.getByText('Not reported')).toBeInTheDocument()
    expect(screen.queryByText('Not served')).not.toBeInTheDocument()
    expect(screen.queryByText(/Development mock/)).not.toBeInTheDocument()
  })
})
