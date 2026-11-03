import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/app/providers/AuthContext'
import { getJourney } from '@/features/journeys/api/journeys'
import JourneyDetailPage from '@/features/journeys/pages/JourneyDetailPage'
import type { JourneyDetail, JourneyStop } from '@/features/journeys/types'
import { getStations } from '@/features/stations/api/stations'
import type { Station } from '@/features/stations/types'
import { ApiError } from '@/shared/api/ApiError'
import { publishDelay } from '../api/publish'
import { getPublishingRules } from '../api/publishingRules'
import type { PublishedChange } from '../types'
import PublishDelayPage from './PublishDelayPage'
import PublishedChangePage from './PublishedChangePage'

vi.mock('../api/publish')
vi.mock('../api/publishingRules')
vi.mock('@/features/journeys/api/journeys')
vi.mock('@/features/stations/api/stations')

const JOURNEY_ID = '0196f2a0-0000-7000-8000-000000000001'
const JOURNEY_PATH = `/journeys/${JOURNEY_ID}`
const PUBLISH_PATH = `${JOURNEY_PATH}/publish/delay`

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
    id: 'st-1',
    code: 'CMB',
    name: 'Colombo Fort',
    isInterchange: true,
    platforms: [{ id: 'pl-1', stationId: 'st-1', number: '1' }],
    lines: [],
  },
  {
    id: 'st-2',
    code: 'GPH',
    name: 'Gampaha',
    isInterchange: false,
    platforms: [{ id: 'pl-2', stationId: 'st-2', number: '2' }],
    lines: [],
  },
  {
    id: 'st-3',
    code: 'PLG',
    name: 'Polgahawela',
    isInterchange: false,
    platforms: [{ id: 'pl-3', stationId: 'st-3', number: '3' }],
    lines: [],
  },
]

function stop(sequence: number, overrides: Partial<JourneyStop> = {}): JourneyStop {
  return {
    sequence,
    stationId: `st-${sequence}`,
    stationName: `Station ${sequence}`,
    isCalling: true,
    scheduledArrival: null,
    scheduledDeparture: null,
    expectedArrival: null,
    expectedDeparture: null,
    actualDeparture: null,
    platformId: `pl-${sequence}`,
    platformNumber: String(sequence),
    ...overrides,
  }
}

const publishedChange: PublishedChange = {
  id: '0196f2a0-0000-7000-8000-0000000000c1',
  type: 'delay',
  values: { fromStopSequence: '2', minutes: '15' },
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
  status: 'running',
  delayMinutes: null,
  lastDepartedStation: { id: 'st-1', name: 'Colombo Fort' },
  nextStation: { id: 'st-2', name: 'Gampaha' },
  guardName: null,
  lastUpdatedAt: '2026-10-28T02:35:00Z',
  isStale: false,
  stops: [
    stop(1, {
      stationName: 'Colombo Fort',
      scheduledDeparture: '2026-10-28T02:30:00Z',
      expectedDeparture: '2026-10-28T02:30:00Z',
      actualDeparture: '2026-10-28T02:31:00Z',
    }),
    stop(2, {
      stationName: 'Gampaha',
      scheduledDeparture: '2026-10-28T02:55:00Z',
      expectedDeparture: '2026-10-28T02:57:00Z',
    }),
    stop(3, {
      stationName: 'Polgahawela',
      scheduledDeparture: '2026-10-28T03:10:00Z',
      expectedDeparture: '2026-10-28T03:12:00Z',
    }),
  ],
  changes: [publishedChange],
}

function renderPage(path = PUBLISH_PATH) {
  const router = createMemoryRouter(
    [
      {
        path: '/journeys/:journeyId',
        element: <JourneyDetailPage />,
        children: [
          { path: 'publish/delay', element: <PublishDelayPage /> },
          { path: 'published/:changeId', element: <PublishedChangePage /> },
        ],
      },
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

async function chooseDelay(user: ReturnType<typeof userEvent.setup>, stopLabel = 'Stop 2: Gampaha', minutes = '15') {
  await user.selectOptions(await screen.findByLabelText('Delay starts at stop'), stopLabel)
  await user.type(screen.getByLabelText('Delay in minutes'), minutes)
}

describe('PublishDelayPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getJourney).mockResolvedValue(detail)
    vi.mocked(getStations).mockResolvedValue(stations)
    vi.mocked(getPublishingRules).mockResolvedValue({ delay: { minMinutes: 1, maxMinutes: 720 } })
  })

  it('opens the delay drawer from its route, with the journey detail still mounted behind it', async () => {
    renderPage()

    const drawer = await screen.findByRole('dialog', { name: 'Publish a delay' })
    expect(await within(drawer).findByText('Kandy Express · Main Line')).toBeInTheDocument()
    await screen.findByRole('heading', { level: 1, name: 'Kandy Express' })
    expect(screen.getByRole('button', { name: 'Close panel' })).toBeInTheDocument()
    expect(drawer).toHaveAttribute('aria-modal', 'true')
  })

  it('offers only calling stops the train has not left yet', async () => {
    renderPage()

    const select = await screen.findByLabelText('Delay starts at stop')
    expect(within(select).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Choose a stop',
      'Stop 2: Gampaha',
      'Stop 3: Polgahawela',
    ])
  })

  it('shows the minutes and stop hints when the fields are left invalid', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('dialog', { name: 'Publish a delay' })
    await user.type(await screen.findByLabelText('Delay in minutes'), '0')
    await user.tab()
    expect(screen.getByText('Enter a whole number of minutes from 1 to 720.')).toBeInTheDocument()

    await user.click(screen.getByLabelText('Delay starts at stop'))
    await user.tab()
    expect(screen.getByText('Choose the stop the delay starts at.')).toBeInTheDocument()
  })

  it('takes the hint and the range message from the publishing rules', async () => {
    const user = userEvent.setup()
    vi.mocked(getPublishingRules).mockResolvedValue({ delay: { minMinutes: 5, maxMinutes: 60 } })
    renderPage()

    await screen.findByRole('dialog', { name: 'Publish a delay' })
    expect(await screen.findByText('Whole minutes, 5 to 60.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Delay in minutes'), '4')
    await user.tab()
    expect(screen.getByText('Enter a whole number of minutes from 5 to 60.')).toBeInTheDocument()
  })

  it('keeps the form loading and Review disabled until the publishing rules arrive', async () => {
    let resolveRules: (value: { delay: { minMinutes: number; maxMinutes: number } }) => void = () => {}
    vi.mocked(getPublishingRules).mockReturnValue(
      new Promise((resolve) => {
        resolveRules = resolve
      }),
    )
    renderPage()

    await screen.findByRole('dialog', { name: 'Publish a delay' })
    expect(await screen.findByRole('status')).toHaveTextContent('Loading…')
    expect(screen.getByRole('button', { name: 'Review delay' })).toBeDisabled()
    expect(screen.queryByLabelText('Delay in minutes')).not.toBeInTheDocument()

    resolveRules({ delay: { minMinutes: 1, maxMinutes: 720 } })

    expect(await screen.findByLabelText('Delay in minutes')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Review delay' })).toBeDisabled()
  })

  it('shows a retryable error and keeps Review disabled when the publishing rules fail', async () => {
    const user = userEvent.setup()
    vi.mocked(getPublishingRules).mockRejectedValueOnce(
      new ApiError(503, 'UNKNOWN', 'The publishing rules are unavailable.'),
    )
    renderPage()

    await screen.findByRole('dialog', { name: 'Publish a delay' })
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
    expect(screen.getByRole('button', { name: 'Review delay' })).toBeDisabled()
    expect(screen.queryByLabelText('Delay in minutes')).not.toBeInTheDocument()

    vi.mocked(getPublishingRules).mockResolvedValue({ delay: { minMinutes: 1, maxMinutes: 720 } })
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByLabelText('Delay in minutes')).toBeInTheDocument()
  })

  it('previews the downstream times and captions the estimate as server-calculated', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('dialog', { name: 'Publish a delay' })
    await chooseDelay(user)

    const table = screen.getByRole('table', { name: /Estimate; the server calculates the published times/ })
    expect(within(table).getByText('Estimate; the server calculates the published times.')).toBeInTheDocument()
    const rows = within(table).getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Stop 2: Gampaha')
    expect(rows[1]).toHaveTextContent('08:25')
    expect(rows[1]).toHaveTextContent('08:27')
    expect(rows[1]).toHaveTextContent('08:42')
    expect(rows[2]).toHaveTextContent('Stop 3: Polgahawela')
    expect(rows[2]).toHaveTextContent('08:57')
    // The chosen stop is the first row; the departed stop is not previewed.
    expect(within(table).queryByText(/Colombo Fort/)).not.toBeInTheDocument()
    expect(within(table).getAllByRole('row')).toHaveLength(3)
  })

  it('shows the review dialog with its summary, audiences and provenance note', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('dialog', { name: 'Publish a delay' })
    await chooseDelay(user)
    await user.click(screen.getByRole('button', { name: 'Review delay' }))

    const dialog = await screen.findByRole('dialog', { name: 'Publish this delay?' })
    expect(
      within(dialog).getByText('Delay of 15 minutes from Stop 2: Gampaha on Kandy Express.'),
    ).toBeInTheDocument()
    expect(within(dialog).getByText('This reaches:')).toBeInTheDocument()
    expect(within(dialog).getByText('Passenger app')).toBeInTheDocument()
    expect(within(dialog).getByText('Catering provider')).toBeInTheDocument()
    expect(within(dialog).getByText(/Published immediately to every channel by Dev Network Controller/)).toBeInTheDocument()
    expect(within(dialog).queryByText(/Automatically published|Human-authored/)).not.toBeInTheDocument()
  })

  it('posts the delay body and navigates to the published confirmation', async () => {
    const user = userEvent.setup()
    vi.mocked(publishDelay).mockResolvedValue(publishedChange)
    const router = renderPage()

    await screen.findByRole('dialog', { name: 'Publish a delay' })
    await chooseDelay(user)
    await user.click(screen.getByRole('button', { name: 'Review delay' }))
    await user.click(screen.getByRole('button', { name: 'Confirm delay' }))

    expect(publishDelay).toHaveBeenCalledWith(JOURNEY_ID, { fromSequence: 2, minutes: 15 })
    expect(await screen.findByRole('heading', { level: 1, name: 'Delay published at 08:10' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`${JOURNEY_PATH}/published/${publishedChange.id}`)
    expect(screen.queryByRole('dialog', { name: 'Publish a delay' })).not.toBeInTheDocument()
  })

  it('keeps the review dialog open with the API 409 detail and keeps the typed values', async () => {
    const user = userEvent.setup()
    vi.mocked(publishDelay).mockRejectedValue(new ApiError(409, 'CONFLICT', 'Stop 2 has already departed.'))
    renderPage()

    await screen.findByRole('dialog', { name: 'Publish a delay' })
    await chooseDelay(user)
    await user.click(screen.getByRole('button', { name: 'Review delay' }))
    const dialog = await screen.findByRole('dialog', { name: 'Publish this delay?' })
    await user.click(within(dialog).getByRole('button', { name: 'Confirm delay' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Stop 2 has already departed.')
    expect(screen.getByRole('dialog', { name: 'Publish this delay?' })).toBeInTheDocument()
    expect(screen.getByLabelText('Delay in minutes')).toHaveValue('15')
    expect(screen.getByLabelText('Delay starts at stop')).toHaveValue('2')
  })

  it('closes the review dialog without publishing when the user goes back', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('dialog', { name: 'Publish a delay' })
    await chooseDelay(user)
    await user.click(screen.getByRole('button', { name: 'Review delay' }))
    const dialog = await screen.findByRole('dialog', { name: 'Publish this delay?' })
    await user.click(within(dialog).getByRole('button', { name: 'Go back' }))

    expect(screen.queryByRole('dialog', { name: 'Publish this delay?' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Publish a delay' })).toBeInTheDocument()
    expect(publishDelay).not.toHaveBeenCalled()
  })

  it('moves focus into the drawer, keeps Tab inside it, and closes on Escape', async () => {
    const user = userEvent.setup()
    const router = renderPage()

    const drawer = await screen.findByRole('dialog', { name: 'Publish a delay' })
    expect(drawer).toHaveFocus()

    for (let press = 0; press < 8; press += 1) {
      await user.tab()
      expect(drawer.contains(document.activeElement)).toBe(true)
    }

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Publish a delay' })).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe(JOURNEY_PATH)
  })

  it('returns focus to the action that opened it', async () => {
    const user = userEvent.setup()
    renderPage(JOURNEY_PATH)

    const trigger = await screen.findByRole('link', { name: 'Publish a delay' })
    await user.click(trigger)
    await screen.findByRole('dialog', { name: 'Publish a delay' })

    await user.keyboard('{Escape}')

    expect(await screen.findByRole('link', { name: 'Publish a delay' })).toHaveFocus()
  })

  it('asks before leaving with an unpublished change, and stays when the user chooses to stay', async () => {
    const user = userEvent.setup()
    const router = renderPage()

    const drawer = await screen.findByRole('dialog', { name: 'Publish a delay' })
    await user.type(await screen.findByLabelText('Delay in minutes'), '5')
    await user.click(within(drawer).getByRole('button', { name: 'Cancel' }))

    const dialog = await screen.findByRole('dialog', { name: 'Leave without publishing?' })
    await user.click(within(dialog).getByRole('button', { name: 'Stay on this page' }))

    expect(screen.queryByRole('dialog', { name: 'Leave without publishing?' })).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe(PUBLISH_PATH)
    expect(screen.getByLabelText('Delay in minutes')).toHaveValue('5')
  })

  it('leaves and discards the change when the user confirms the unsaved-changes prompt', async () => {
    const user = userEvent.setup()
    const router = renderPage()

    const drawer = await screen.findByRole('dialog', { name: 'Publish a delay' })
    await user.type(await screen.findByLabelText('Delay in minutes'), '5')
    await user.click(within(drawer).getByRole('button', { name: 'Cancel' }))

    const dialog = await screen.findByRole('dialog', { name: 'Leave without publishing?' })
    await user.click(within(dialog).getByRole('button', { name: 'Leave' }))

    expect(router.state.location.pathname).toBe(JOURNEY_PATH)
    expect(screen.queryByRole('dialog', { name: 'Publish a delay' })).not.toBeInTheDocument()
    expect(publishDelay).not.toHaveBeenCalled()
  })

  it('shows the not-found state inside the drawer for a journey that does not exist', async () => {
    vi.mocked(getJourney).mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'No such journey.'))
    renderPage()

    expect((await screen.findAllByRole('heading', { name: 'Journey not found' })).length).toBeGreaterThan(0)
    expect(screen.queryByLabelText('Delay in minutes')).not.toBeInTheDocument()
  })

  it('does not show a development mock note, because every publish call reaches the API', async () => {
    renderPage()

    await screen.findByRole('dialog', { name: 'Publish a delay' })
    expect(screen.queryByText(/Development mock/)).not.toBeInTheDocument()
  })
})
