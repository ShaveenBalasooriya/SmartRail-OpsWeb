import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/app/providers/AuthContext'
import type { Role } from '@/features/auth/types'
import type { PublishedChange } from '@/features/publishing/types'
import { getStations } from '@/features/stations/api/stations'
import type { Station } from '@/features/stations/types'
import { ApiError } from '@/shared/api/ApiError'
import { getJourney } from '../api/journeys'
import type { JourneyDetail, JourneyStatus, JourneyStop } from '../types'
import JourneyDetailPage from './JourneyDetailPage'

vi.mock('../api/journeys')
vi.mock('@/features/stations/api/stations')

const JOURNEY_ID = '0196f2a0-0000-7000-8000-000000000001'

// Railway time is Asia/Colombo (UTC+05:30), so 02:30Z is 08:00 on the railway clock.
function stop(sequence: number, overrides: Partial<JourneyStop> = {}): JourneyStop {
  return {
    sequence,
    stationId: `st-${sequence}`,
    stationName: `Station ${sequence}`,
    isCalling: true,
    scheduledArrival: null,
    scheduledDeparture: `2026-10-28T0${sequence}:00:00Z`,
    expectedArrival: null,
    expectedDeparture: null,
    actualDeparture: null,
    platformId: `pl-${sequence}`,
    platformNumber: String(sequence),
    ...overrides,
  }
}

const delayChange: PublishedChange = {
  id: 'c-delay',
  type: 'delay',
  values: { fromStopSequence: '1', minutes: '15' },
  publisherName: 'Nimalka Silva',
  // 02:34Z is 08:04 on the railway clock.
  publishedAt: '2026-10-28T02:34:00Z',
  provenance: 'automatically_published',
  corrected: true,
}

const correctionChange: PublishedChange = {
  id: 'c-correction',
  type: 'correction',
  values: { correctsChangeId: 'c-delay' },
  publisherName: null,
  // 02:36Z is 08:06 on the railway clock.
  publishedAt: '2026-10-28T02:36:00Z',
  provenance: 'automatically_published',
  corrected: false,
}

const platformChange: PublishedChange = {
  id: 'c-platform',
  type: 'platform_change',
  values: { stopSequence: '2', platformId: 'pl-2' },
  publisherName: 'Nimalka Silva',
  // 02:50Z is 08:20 on the railway clock.
  publishedAt: '2026-10-28T02:50:00Z',
  provenance: 'automatically_published',
  corrected: false,
}

const terminationChange: PublishedChange = {
  id: 'c-termination',
  type: 'termination',
  values: { lastStopSequence: '2', lastStopStationId: 'st-2' },
  publisherName: 'Nimalka Silva',
  // 03:00Z is 08:30 on the railway clock.
  publishedAt: '2026-10-28T03:00:00Z',
  provenance: 'automatically_published',
  corrected: false,
}

const detail: JourneyDetail = {
  id: JOURNEY_ID,
  serviceName: 'Kandy Express',
  lineCode: 'KDY',
  lineName: 'Main Line',
  direction: 'outbound',
  status: 'running',
  delayMinutes: 15,
  lastDepartedStation: { id: 'st-2', name: 'Gampaha' },
  nextStation: { id: 'st-3', name: 'Polgahawela' },
  guardName: 'Nimal Perera',
  lastUpdatedAt: '2026-10-28T02:35:00Z',
  isStale: false,
  stops: [
    stop(1, {
      stationId: 'st-1',
      stationName: 'Colombo Fort',
      scheduledDeparture: '2026-10-28T02:30:00Z',
      expectedDeparture: '2026-10-28T02:30:00Z',
      actualDeparture: '2026-10-28T02:31:00Z',
      platformId: 'pl-1',
      platformNumber: '1',
    }),
    stop(2, {
      stationId: 'st-2',
      stationName: 'Gampaha',
      scheduledDeparture: '2026-10-28T02:55:00Z',
      expectedDeparture: '2026-10-28T02:57:00Z',
      actualDeparture: '2026-10-28T02:57:00Z',
      platformId: 'pl-2',
      platformNumber: '2',
    }),
    stop(3, {
      stationId: 'st-3',
      stationName: 'Polgahawela',
      scheduledDeparture: '2026-10-28T03:10:00Z',
      expectedDeparture: '2026-10-28T03:12:00Z',
      platformId: 'pl-3',
      platformNumber: '3',
    }),
    stop(4, {
      stationId: 'st-4',
      stationName: 'Peradeniya Junction',
      scheduledDeparture: '2026-10-28T03:30:00Z',
      expectedDeparture: '2026-10-28T03:32:00Z',
      platformId: 'pl-4',
      platformNumber: '3',
    }),
  ],
  changes: [delayChange, correctionChange, platformChange],
}

function station(id: string, name: string, isInterchange: boolean): Station {
  return { id, code: id.toUpperCase(), name, isInterchange, platforms: [], lines: [] }
}

function authFor(role: Role): AuthContextValue {
  return {
    currentUser: { id: `dev-${role}`, displayName: 'Test user', role },
    isSignedIn: true,
    isLoading: false,
    signIn: vi.fn(),
    completeSignIn: vi.fn(),
    logout: vi.fn(),
  }
}

function renderPage({ role = 'network_controller' }: { role?: Role } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authFor(role)}>
        <MemoryRouter initialEntries={[{ pathname: `/journeys/${JOURNEY_ID}` }]}>
          <Routes>
            <Route path="/journeys/:journeyId" element={<JourneyDetailPage />} />
            <Route path="/journeys/:journeyId/publish/correction" element={<CorrectionLocation />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

// A stand-in for the correction drawer: it records the URL the history entry links to.
function CorrectionLocation() {
  const location = useLocation()
  return <p data-testid="correction-location">{location.pathname + location.search}</p>
}

describe('JourneyDetailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // Reference data is not the subject of most of these tests; an empty list means no Interchange tags.
    vi.mocked(getStations).mockResolvedValue([])
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

  it('shows the error state and a retry when the journey cannot load', async () => {
    vi.mocked(getJourney).mockRejectedValue(new Error('The operations feed could not load.'))

    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('shows the journey-not-found state for a 404 from the API', async () => {
    vi.mocked(getJourney).mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'No such journey.'))

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Journey not found' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('sends a role the API refuses to the existing forbidden page', async () => {
    vi.mocked(getJourney).mockRejectedValue(
      new ApiError(403, 'FORBIDDEN_ROLE', 'The operations read needs the Network Controller role.'),
    )

    renderPage({ role: 'auditor' })

    expect(await screen.findByRole('heading', { name: "You don't have access to this page" })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('403')
    expect(screen.queryByRole('heading', { name: 'Journey not found' })).not.toBeInTheDocument()
  })

  it('reads the journey, its stops and its changes from one detail request', async () => {
    vi.mocked(getJourney).mockResolvedValue(detail)

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    expect(getJourney).toHaveBeenCalledWith(JOURNEY_ID)
    expect(getJourney).toHaveBeenCalledTimes(1)
  })

  it('shows the details grid, the progress and the stops with their times and platforms', async () => {
    vi.mocked(getJourney).mockResolvedValue(detail)

    renderPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })).toBeInTheDocument()
    expect(screen.getByText('KDY Main Line')).toBeInTheDocument()
    expect(screen.getByText('Running')).toBeInTheDocument()
    expect(screen.getByText('15 min late')).toBeInTheDocument()
    expect(screen.getByText('Nimal Perera')).toBeInTheDocument()
    expect(screen.getByText('Scheduled departure')).toBeInTheDocument()
    expect(screen.queryByText('Service date')).not.toBeInTheDocument()

    expect(screen.getByRole('heading', { level: 2, name: 'Stops' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Stop timeline' })).toBeInTheDocument()

    const colomboRow = screen.getByRole('row', { name: /Colombo Fort/ })
    const cells = within(colomboRow).getAllByRole('cell')
    // Progress marker, Station, Scheduled, Expected, Actual departure, Platform.
    expect(cells[2]).toHaveTextContent('08:00')
    expect(cells[3]).toHaveTextContent('08:00')
    expect(cells[4]).toHaveTextContent('08:01')
    expect(cells[5]).toHaveTextContent('1')

    const nextRow = screen.getByRole('row', { name: /Polgahawela/ })
    expect(within(nextRow).getByText('Next stop')).toBeInTheDocument()
    const nextCells = within(nextRow).getAllByRole('cell')
    expect(nextCells[2]).toHaveTextContent('08:40')
    expect(nextCells[3]).toHaveTextContent('08:42')
    expect(nextCells[4]).toHaveTextContent('—')

    expect(screen.getByRole('link', { name: 'Back to the live board' })).toHaveAttribute('href', '/board')
  })

  it('tags the stops the station reference data marks as interchanges', async () => {
    vi.mocked(getJourney).mockResolvedValue(detail)
    vi.mocked(getStations).mockResolvedValue([
      station('st-2', 'Gampaha', true),
      station('st-3', 'Polgahawela', false),
    ])

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    const gampaha = screen.getByRole('row', { name: /Gampaha/ })
    await within(gampaha).findByText('Interchange')
    expect(screen.getAllByText('Interchange')).toHaveLength(1)
  })

  it('keeps the stop list without tags when the station reference data fails', async () => {
    vi.mocked(getJourney).mockResolvedValue(detail)
    vi.mocked(getStations).mockRejectedValue(new Error('The station list could not load.'))

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    expect(screen.getByRole('table', { name: 'Stop timeline' })).toBeInTheDocument()
    expect(screen.queryByText('Interchange')).not.toBeInTheDocument()
  })

  it('derives the scheduled departure from the first calling stop', async () => {
    vi.mocked(getJourney).mockResolvedValue(detail)

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    const details = screen.getByText('Scheduled departure').closest('dl') as HTMLElement
    expect(within(details).getByText('08:00')).toHaveAttribute('datetime', '2026-10-28T02:30:00Z')
  })

  it('shows the progress bar and the sentence for a running journey', async () => {
    vi.mocked(getJourney).mockResolvedValue(detail)

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    const bar = screen.getByRole('progressbar', { name: 'Stops departed' })
    expect(bar).toHaveAttribute('aria-valuenow', '2')
    expect(bar).toHaveAttribute('aria-valuemax', '4')
    const progress = screen.getByRole('region', { name: 'Progress' })
    expect(within(progress).getByText('2 of 4 stops departed.')).toBeInTheDocument()
    expect(within(progress).getByText(/Last departed Gampaha at/)).toBeInTheDocument()
    expect(within(progress).getByText(/Next stop Polgahawela, expected/)).toBeInTheDocument()
    expect(
      within(progress).getByText("Progress is derived from the guard's departure logs."),
    ).toBeInTheDocument()
    expect(within(progress).getByText('08:27')).toBeInTheDocument()
    expect(within(progress).getByText('08:42')).toBeInTheDocument()
  })

  it('shows no progress for a scheduled journey', async () => {
    vi.mocked(getJourney).mockResolvedValue({
      ...detail,
      status: 'scheduled',
      delayMinutes: 0,
      stops: detail.stops.map((item) => ({ ...item, actualDeparture: null })),
    })

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Progress' })).not.toBeInTheDocument()
  })

  it('shows the progress for a terminated journey, with no next stop', async () => {
    vi.mocked(getJourney).mockResolvedValue({
      ...detail,
      status: 'terminated',
      changes: [terminationChange, ...detail.changes],
    })

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    const bar = screen.getByRole('progressbar', { name: 'Stops departed' })
    expect(bar).toHaveAttribute('aria-valuenow', '2')
    expect(bar).toHaveAttribute('aria-valuemax', '4')
    expect(screen.getByText(/Last departed Gampaha at/)).toBeInTheDocument()
    expect(screen.queryByText(/Next stop/)).not.toBeInTheDocument()
  })

  it('marks the stops after an early termination as not served', async () => {
    vi.mocked(getJourney).mockResolvedValue({
      ...detail,
      status: 'terminated',
      changes: [terminationChange, ...detail.changes],
    })

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    const row = screen.getByRole('row', { name: /Polgahawela/ })
    expect(within(row).getAllByText('Not served').length).toBeGreaterThanOrEqual(1)
    expect(within(row).getAllByRole('cell')[3]).toHaveTextContent('Not served')
    expect(within(row).getAllByRole('cell')[4]).toHaveTextContent('—')
  })

  it('marks a journey the API reports as stale', async () => {
    vi.mocked(getJourney).mockResolvedValue({ ...detail, isStale: true })

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    expect(screen.getByText('Stale')).toBeInTheDocument()
  })

  it('keeps the journey on screen and shows an alert when a refresh fails', async () => {
    const user = userEvent.setup()
    vi.mocked(getJourney).mockResolvedValueOnce(detail).mockRejectedValueOnce(new Error('Network down'))

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    await user.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not refresh the journey.')
    expect(screen.getByRole('heading', { level: 1, name: 'Kandy Express' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Stop timeline' })).toBeInTheDocument()
  })

  it('shows "No stops listed" for a journey with no stops', async () => {
    vi.mocked(getJourney).mockResolvedValue({ ...detail, stops: [] })

    renderPage()

    expect(await screen.findByRole('heading', { name: 'No stops listed' })).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Stop timeline' })).not.toBeInTheDocument()
  })

  it('offers a running journey the delay, platform and early-termination actions to a controller', async () => {
    vi.mocked(getJourney).mockResolvedValue(detail)

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    expect(screen.getByRole('heading', { level: 2, name: 'Publish a change' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Publish a delay' })).toHaveAttribute(
      'href',
      `/journeys/${JOURNEY_ID}/publish/delay`,
    )
    expect(screen.getByRole('link', { name: 'Change a platform' })).toHaveAttribute(
      'href',
      `/journeys/${JOURNEY_ID}/publish/platform-change`,
    )
    expect(screen.getByRole('link', { name: 'Early termination' })).toHaveAttribute(
      'href',
      `/journeys/${JOURNEY_ID}/publish/termination`,
    )
    // The server refuses a cancellation once a departure is recorded.
    expect(screen.queryByRole('link', { name: 'Cancel journey' })).not.toBeInTheDocument()
  })

  it('offers a scheduled journey the delay, cancellation and platform actions', async () => {
    vi.mocked(getJourney).mockResolvedValue({
      ...detail,
      status: 'scheduled',
      stops: detail.stops.map((item) => ({ ...item, actualDeparture: null })),
    })

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    expect(screen.getByRole('link', { name: 'Publish a delay' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cancel journey' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Change a platform' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Early termination' })).not.toBeInTheDocument()
  })

  it.each<JourneyStatus>(['cancelled', 'terminated', 'completed'])(
    'offers no publish action on a %s journey',
    async (status) => {
      vi.mocked(getJourney).mockResolvedValue({ ...detail, status })

      renderPage()

      await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
      expect(screen.queryByRole('heading', { name: 'Publish a change' })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /Publish a delay|Change a platform|Early termination|Cancel journey/ })).not.toBeInTheDocument()
    },
  )

  it('hides the publish actions from an auditor', async () => {
    vi.mocked(getJourney).mockResolvedValue(detail)

    renderPage({ role: 'auditor' })

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    expect(screen.queryByRole('heading', { name: 'Publish a change' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Publish a delay' })).not.toBeInTheDocument()
  })

  it('shows the platform change time under the platform it applies to', async () => {
    vi.mocked(getJourney).mockResolvedValue(detail)

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    const row = screen.getByRole('row', { name: /Gampaha/ })
    const platformCell = within(row).getAllByRole('cell')[5] as HTMLElement
    expect(platformCell).toHaveTextContent('Changed at 08:20')
  })

  it('offers a correction on a change the server would still accept one for, and not on a correction', async () => {
    vi.mocked(getJourney).mockResolvedValue(detail)

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    const history = screen.getByRole('region', { name: 'Change history' })
    const items = within(history).getAllByRole('listitem')

    // Newest first: the platform change, the correction, then the corrected delay.
    expect(within(items[0] as HTMLElement).getByRole('link', { name: 'Correct this change' })).toBeInTheDocument()
    expect(within(items[1] as HTMLElement).queryByRole('link', { name: 'Correct this change' })).not.toBeInTheDocument()
    expect(within(items[2] as HTMLElement).queryByRole('link', { name: 'Correct this change' })).not.toBeInTheDocument()
  })

  it('hides the correction action from an auditor', async () => {
    vi.mocked(getJourney).mockResolvedValue(detail)

    renderPage({ role: 'auditor' })

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    expect(screen.queryByRole('link', { name: 'Correct this change' })).not.toBeInTheDocument()
  })

  it('hides the correction action on a change that is already corrected', async () => {
    vi.mocked(getJourney).mockResolvedValue(detail)

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    const history = screen.getByRole('region', { name: 'Change history' })
    const delayItem = within(history).getAllByRole('listitem')[2] as HTMLElement
    expect(within(delayItem).queryByRole('link', { name: 'Correct this change' })).not.toBeInTheDocument()
  })

  it('hides the correction action once the journey is completed', async () => {
    vi.mocked(getJourney).mockResolvedValue({ ...detail, status: 'completed' })

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    expect(screen.queryByRole('link', { name: 'Correct this change' })).not.toBeInTheDocument()
  })

  it('links a correctable change to the correction drawer with its id', async () => {
    const user = userEvent.setup()
    vi.mocked(getJourney).mockResolvedValue(detail)

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    await user.click(screen.getByRole('link', { name: 'Correct this change' }))

    expect(await screen.findByTestId('correction-location')).toHaveTextContent(
      `/journeys/${JOURNEY_ID}/publish/correction?changeId=c-platform`,
    )
  })

  it('shows no publish notice, because a publish now lands on its own confirmation page', async () => {
    vi.mocked(getJourney).mockResolvedValue(detail)

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('lists the change history newest first with its wording, provenance, publisher and time', async () => {
    vi.mocked(getJourney).mockResolvedValue(detail)

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    const history = screen.getByRole('region', { name: 'Change history' })
    const items = within(history).getAllByRole('listitem')

    expect(items[0]).toHaveTextContent('Platform change')
    expect(items[0]).toHaveTextContent('Stop 2 moves to platform 2')
    expect(items[0]).toHaveTextContent('Automatically published')
    expect(items[0]).toHaveTextContent('Nimalka Silva')
    expect(items[0]).toHaveTextContent('08:20')
    expect(items[1]).toHaveTextContent('Correction')
    expect(items[1]).toHaveTextContent('Reverts the change published at 08:04')
    expect(items[1]).toHaveTextContent('Unknown publisher')
    expect(items[2]).toHaveTextContent('Delay of 15 minutes from stop 1')
    expect(items[2]).toHaveTextContent('08:04')
  })

  it('marks a corrected change and links a correction and its original in both directions', async () => {
    vi.mocked(getJourney).mockResolvedValue(detail)

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    expect(screen.getByText('Corrected')).toBeInTheDocument()

    const history = screen.getByRole('region', { name: 'Change history' })
    const items = within(history).getAllByRole('listitem')
    const correction = items[1] as HTMLElement
    const corrected = items[2] as HTMLElement

    expect(within(correction).getByRole('link', { name: 'Original: Delay at 08:04' })).toHaveAttribute(
      'href',
      '#change-c-delay',
    )
    expect(within(corrected).getByRole('link', { name: 'Corrected by: Correction at 08:06' })).toHaveAttribute(
      'href',
      '#change-c-correction',
    )
    expect(document.getElementById('change-c-delay')).toBeInTheDocument()
  })

  it('says no changes were published when the journey has none', async () => {
    vi.mocked(getJourney).mockResolvedValue({ ...detail, changes: [] })

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    expect(screen.getByText('No changes published')).toBeInTheDocument()
  })

  it('no longer shows the development mock note on the read path', async () => {
    vi.mocked(getJourney).mockResolvedValue(detail)

    renderPage()

    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    expect(screen.queryByText(/Development mock/)).not.toBeInTheDocument()
  })
})
