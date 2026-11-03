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
import { publishCorrection } from '../api/publish'
import type { PublishedChange } from '../types'
import PublishCorrectionPage from './PublishCorrectionPage'
import PublishedChangePage from './PublishedChangePage'

vi.mock('../api/publish')
vi.mock('@/features/journeys/api/journeys')
vi.mock('@/features/stations/api/stations')

const JOURNEY_ID = '0196f2a0-0000-7000-8000-000000000001'
const JOURNEY_PATH = `/journeys/${JOURNEY_ID}`
const CORRECTION_PATH = `${JOURNEY_PATH}/publish/correction`

const controller: AuthContextValue = {
  currentUser: { id: 'dev-network_controller', displayName: 'Dev Network Controller', role: 'network_controller' },
  isSignedIn: true,
  isLoading: false,
  signIn: vi.fn(),
  completeSignIn: vi.fn(),
  logout: vi.fn(),
}

const delayChange: PublishedChange = {
  id: 'c-delay',
  type: 'delay',
  values: { fromStopSequence: '2', minutes: '6' },
  publisherName: 'Nimalka Silva',
  // 02:34Z is 08:04 on the railway clock.
  publishedAt: '2026-10-28T02:34:00Z',
  provenance: 'automatically_published',
  corrected: false,
}

const platformChange: PublishedChange = {
  id: 'c-platform',
  type: 'platform_change',
  values: { stopSequence: '2', platformId: 'pl-2' },
  publisherName: 'Nimalka Silva',
  // 02:38Z is 08:08 on the railway clock.
  publishedAt: '2026-10-28T02:38:00Z',
  provenance: 'automatically_published',
  corrected: false,
}

const alreadyCorrected: PublishedChange = {
  id: 'c-termination',
  type: 'termination',
  values: { lastStopSequence: '2' },
  publisherName: 'Nimalka Silva',
  publishedAt: '2026-10-28T02:30:00Z',
  provenance: 'automatically_published',
  corrected: true,
}

const correctionChange: PublishedChange = {
  id: 'c-old-correction',
  type: 'correction',
  values: { correctsChangeId: 'c-termination' },
  publisherName: 'Nimalka Silva',
  publishedAt: '2026-10-28T02:32:00Z',
  provenance: 'automatically_published',
  corrected: false,
}

const newCorrection: PublishedChange = {
  id: 'c-new-correction',
  type: 'correction',
  values: { correctsChangeId: 'c-delay' },
  publisherName: 'Dev Network Controller',
  // 02:50Z is 08:20 on the railway clock.
  publishedAt: '2026-10-28T02:50:00Z',
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
  lastDepartedStation: null,
  nextStation: null,
  guardName: null,
  lastUpdatedAt: '2026-10-28T02:35:00Z',
  isStale: false,
  stops: [
    {
      sequence: 1,
      stationId: 'st-1',
      stationName: 'Colombo Fort',
      isCalling: true,
      scheduledArrival: null,
      scheduledDeparture: '2026-10-28T02:00:00Z',
      expectedArrival: null,
      expectedDeparture: '2026-10-28T02:00:00Z',
      actualDeparture: '2026-10-28T02:01:00Z',
      platformId: 'pl-1',
      platformNumber: '1',
    },
    {
      sequence: 2,
      stationId: 'st-2',
      stationName: 'Gampaha',
      isCalling: true,
      scheduledArrival: null,
      scheduledDeparture: '2026-10-28T02:55:00Z',
      expectedArrival: null,
      expectedDeparture: '2026-10-28T02:57:00Z',
      actualDeparture: null,
      platformId: 'pl-2',
      platformNumber: '2',
    },
  ],
  changes: [delayChange, platformChange, alreadyCorrected, correctionChange],
}

const detailAfterCorrection: JourneyDetail = {
  ...detail,
  changes: [newCorrection, ...detail.changes],
}

function renderPage(path = `${CORRECTION_PATH}?changeId=c-delay`) {
  const router = createMemoryRouter(
    [
      {
        path: '/journeys/:journeyId',
        element: <JourneyDetailPage />,
        children: [
          { path: 'publish/correction', element: <PublishCorrectionPage /> },
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

describe('PublishCorrectionPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getJourney).mockResolvedValue(detail)
    vi.mocked(getStations).mockResolvedValue([])
  })

  it('opens the correction drawer from its route and preselects the change named in the URL', async () => {
    renderPage()

    const drawer = await screen.findByRole('dialog', { name: 'Correct a change' })
    expect(await within(drawer).findByText('Kandy Express · Main Line')).toBeInTheDocument()
    expect(await screen.findByRole('radio', { name: /Delay of 6 minutes from stop 2/ })).toBeChecked()
  })

  it('offers only the changes the server would still correct', async () => {
    renderPage()

    await screen.findByRole('dialog', { name: 'Correct a change' })
    await screen.findByRole('radio', { name: /Delay of 6 minutes from stop 2/ })
    const options = screen.getAllByRole('radio')
    expect(options).toHaveLength(2)
    expect(screen.getByRole('radio', { name: /Delay of 6 minutes from stop 2/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Stop 2 moves to platform 2/ })).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: /Ends at stop 2/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: /Reverts/ })).not.toBeInTheDocument()
  })

  it('shows what was published and states that a correction withdraws the change', async () => {
    renderPage()

    await screen.findByRole('dialog', { name: 'Correct a change' })
    await screen.findByRole('radio', { name: /Delay of 6 minutes from stop 2/ })

    expect(
      screen.getByText(/The correction endpoint takes no values, so a correction withdraws the original change/),
    ).toBeInTheDocument()
    expect(screen.getByText('Starts at')).toBeInTheDocument()
    expect(screen.getByText('Stop 2: Gampaha')).toBeInTheDocument()
    expect(screen.getByText('6 min')).toBeInTheDocument()
    expect(screen.getByText('Withdrawn')).toBeInTheDocument()
    expect(screen.getByText('3. Confirm')).toBeInTheDocument()
  })

  it('writes the chosen change into the URL so a reload keeps it', async () => {
    const user = userEvent.setup()
    const router = renderPage()

    await screen.findByRole('dialog', { name: 'Correct a change' })
    await user.click(await screen.findByRole('radio', { name: /Stop 2 moves to platform 2/ }))

    expect(router.state.location.search).toBe('?changeId=c-platform')
  })

  it('shows the review dialog and posts the correction for the chosen change', async () => {
    const user = userEvent.setup()
    vi.mocked(getJourney).mockResolvedValue(detailAfterCorrection)
    vi.mocked(publishCorrection).mockResolvedValue(newCorrection)
    const router = renderPage()

    await screen.findByRole('dialog', { name: 'Correct a change' })
    expect(await screen.findByRole('radio', { name: /Delay of 6 minutes from stop 2/ })).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Review correction' }))

    const dialog = await screen.findByRole('dialog', { name: 'Publish this correction?' })
    expect(
      within(dialog).getByText('Corrects the delay published at 08:04 on Kandy Express: the change is withdrawn.'),
    ).toBeInTheDocument()
    expect(within(dialog).getByText('This reaches:')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Confirm correction' }))

    expect(publishCorrection).toHaveBeenCalledWith('c-delay')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Correction published at 08:20' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`${JOURNEY_PATH}/published/${newCorrection.id}`)
  })

  it('keeps the review dialog open with the API detail when the correction is refused', async () => {
    const user = userEvent.setup()
    vi.mocked(publishCorrection).mockRejectedValue(
      new ApiError(409, 'CONFLICT', 'This change already has a correction.'),
    )
    renderPage()

    await screen.findByRole('dialog', { name: 'Correct a change' })
    expect(await screen.findByRole('radio', { name: /Delay of 6 minutes from stop 2/ })).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Review correction' }))
    const dialog = await screen.findByRole('dialog', { name: 'Publish this correction?' })
    await user.click(within(dialog).getByRole('button', { name: 'Confirm correction' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('This change already has a correction.')
    expect(screen.getByRole('dialog', { name: 'Publish this correction?' })).toBeInTheDocument()
  })

  it('says so when there is nothing left to correct', async () => {
    vi.mocked(getJourney).mockResolvedValue({ ...detail, changes: [alreadyCorrected, correctionChange] })
    renderPage(CORRECTION_PATH)

    await screen.findByRole('dialog', { name: 'Correct a change' })
    expect(await screen.findByRole('heading', { name: 'No changes can be corrected' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Review correction' })).toBeDisabled()
  })

  it('does not preselect a change the URL names but the server would refuse', async () => {
    renderPage(`${CORRECTION_PATH}?changeId=c-termination`)

    await screen.findByRole('dialog', { name: 'Correct a change' })
    await screen.findByRole('radio', { name: /Delay of 6 minutes from stop 2/ })
    expect(screen.queryByRole('radio', { checked: true })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Review correction' })).toBeDisabled()
  })
})
