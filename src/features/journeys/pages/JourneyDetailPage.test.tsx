import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
    platforms: [{ id: 'pl-kandy-2', stationId: 'st-kandy', number: '2' }],
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

function renderPage(path = `/journeys/${JOURNEY_ID}?date=2026-10-21`) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/journeys/:journeyId" element={<JourneyDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('JourneyDetailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getStations).mockResolvedValue(stations)
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
    expect(within(kandyRow).getAllByRole('cell')[4]).toHaveTextContent('2')
    expect(screen.getByText('Kandy')).toBeInTheDocument()
    expect(screen.getByText('Unknown station')).toBeInTheDocument()
    expect(screen.getAllByText('Passes')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Back to the live board' })).toHaveAttribute('href', '/board')
  })

  it('keeps the journey on screen and shows an alert when a refresh fails', async () => {
    const user = userEvent.setup()
    vi.mocked(getJourney)
      .mockResolvedValueOnce(detail)
      .mockRejectedValueOnce(new Error('Network down'))

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
})
