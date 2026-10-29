import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/app/providers/AuthContext'
import type { Role } from '@/features/auth/types'
import { ApiError } from '@/shared/api/ApiError'
import { railwayDateKey } from '@/shared/lib/railwayTime'
import { getJourneys } from '../api/journeys'
import type { Journey } from '../types'
import LiveBoardPage from './LiveBoardPage'

vi.mock('../api/journeys')

// 02:35Z is 08:05 on the railway clock.
const kandy: Journey = {
  id: '0196f2a0-0000-7000-8000-000000000001',
  serviceName: 'Kandy Express',
  lineCode: 'KDY',
  lineName: 'Main Line',
  direction: 'outbound',
  status: 'running',
  delayMinutes: 7,
  lastDepartedStation: { id: 'st-kandy', name: 'Kandy' },
  nextStation: { id: 'st-galle', name: 'Galle' },
  guardName: 'Nimal Perera',
  lastUpdatedAt: '2026-10-28T02:35:00Z',
  isStale: false,
}

const galle: Journey = {
  id: '0196f2a0-0000-7000-8000-000000000002',
  serviceName: 'Galle Local',
  lineCode: 'GLE',
  lineName: 'Coastal Line',
  direction: 'inbound',
  status: 'cancelled',
  delayMinutes: null,
  lastDepartedStation: null,
  nextStation: null,
  guardName: null,
  lastUpdatedAt: '2026-10-28T03:10:00Z',
  isStale: true,
}

const nightMail: Journey = {
  id: '0196f2a0-0000-7000-8000-000000000003',
  serviceName: 'Night Mail',
  lineCode: 'KDY',
  lineName: 'Main Line',
  direction: 'inbound',
  status: 'scheduled',
  delayMinutes: 0,
  lastDepartedStation: null,
  nextStation: { id: 'st-fort', name: 'Colombo Fort' },
  guardName: null,
  lastUpdatedAt: '2026-10-28T03:20:00Z',
  isStale: false,
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

function renderBoard(role: Role = 'network_controller', readOnly = false) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authFor(role)}>
        <MemoryRouter>
          <LiveBoardPage readOnly={readOnly} />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

async function rowFor(name: string): Promise<HTMLElement> {
  return screen.findByRole('row', { name: new RegExp(name) })
}

function summaryTile(hint: string): HTMLElement {
  const hintElement = within(screen.getByRole('list', { name: 'Summary' })).getByText(hint)
  const tile = hintElement.closest('li')
  if (tile === null) {
    throw new Error(`No summary tile for the hint "${hint}"`)
  }
  return tile
}

describe('LiveBoardPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('heads the board with the railway date and says updates arrive automatically', async () => {
    vi.mocked(getJourneys).mockResolvedValue([kandy])

    renderBoard()

    expect(screen.getByRole('heading', { name: 'Live operations board' })).toBeInTheDocument()
    expect(
      screen.getByText(`Journeys for ${railwayDateKey(new Date())} · updates arrive automatically`),
    ).toBeInTheDocument()
    expect(await screen.findByRole('row', { name: /Kandy Express/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument()
    // The freshness note and the table's column header.
    expect(screen.getAllByText(/Last updated/)).toHaveLength(2)
    expect(getJourneys).toHaveBeenCalled()
  })

  it('summarises the loaded journeys: running, late, cancelled and stale', async () => {
    vi.mocked(getJourneys).mockResolvedValue([kandy, galle, nightMail])

    renderBoard()

    await screen.findByRole('row', { name: /Kandy Express/ })
    expect(within(summaryTile('journeys on the network now')).getByText('1')).toBeInTheDocument()
    expect(within(summaryTile('running behind schedule')).getByText('1')).toBeInTheDocument()
    expect(within(summaryTile('no service on this date')).getByText('1')).toBeInTheDocument()
    expect(within(summaryTile('no recent update')).getByText('1')).toBeInTheDocument()
  })

  it('does not count a cancelled journey as late, even when it carries a delay', async () => {
    vi.mocked(getJourneys).mockResolvedValue([{ ...galle, delayMinutes: 9 }])

    renderBoard()

    await screen.findByRole('row', { name: /Galle Local/ })
    expect(within(summaryTile('running behind schedule')).getByText('0')).toBeInTheDocument()
  })

  it('shows each journey\'s live status, delay, last and next station, guard and update time', async () => {
    vi.mocked(getJourneys).mockResolvedValue([kandy])

    renderBoard()

    const row = await rowFor('Kandy Express')
    expect(within(row).getByText('Running')).toBeInTheDocument()
    expect(within(row).getByText('7 min late')).toBeInTheDocument()
    expect(within(row).getByText('Kandy')).toBeInTheDocument()
    expect(within(row).getByText('Next: Galle')).toBeInTheDocument()
    expect(within(row).getByText('Guard: Nimal Perera')).toBeInTheDocument()
    expect(within(row).getByText('08:05:00')).toHaveAttribute('datetime', '2026-10-28T02:35:00Z')
  })

  it('marks a journey the API reports as stale, and leaves a fresh one unmarked', async () => {
    vi.mocked(getJourneys).mockResolvedValue([kandy, galle])

    renderBoard()

    expect(within(await rowFor('Galle Local')).getByText('Stale')).toBeInTheDocument()
    expect(within(await rowFor('Kandy Express')).queryByText('Stale')).not.toBeInTheDocument()
  })

  it('keeps only the journeys matching the status filter', async () => {
    const user = userEvent.setup()
    vi.mocked(getJourneys).mockResolvedValue([kandy, galle])

    renderBoard()

    await screen.findByRole('row', { name: /Kandy Express/ })
    await user.selectOptions(screen.getByLabelText('Status'), 'cancelled')

    expect(screen.getByRole('row', { name: /Galle Local/ })).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /Kandy Express/ })).not.toBeInTheDocument()
  })

  it('keeps only the journeys on the chosen line', async () => {
    const user = userEvent.setup()
    vi.mocked(getJourneys).mockResolvedValue([kandy, galle])

    renderBoard()

    await screen.findByRole('row', { name: /Kandy Express/ })
    await user.selectOptions(screen.getByLabelText('Line'), 'GLE')

    expect(screen.getByRole('row', { name: /Galle Local/ })).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /Kandy Express/ })).not.toBeInTheDocument()
  })

  it('keeps only the journeys travelling in the chosen direction', async () => {
    const user = userEvent.setup()
    vi.mocked(getJourneys).mockResolvedValue([kandy, galle])

    renderBoard()

    await screen.findByRole('row', { name: /Kandy Express/ })
    await user.selectOptions(screen.getByLabelText('Direction'), 'outbound')

    expect(screen.getByRole('row', { name: /Kandy Express/ })).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /Galle Local/ })).not.toBeInTheDocument()
  })

  it('filters by service name as the search text is typed', async () => {
    const user = userEvent.setup()
    vi.mocked(getJourneys).mockResolvedValue([kandy, galle])

    renderBoard()

    await screen.findByRole('row', { name: /Kandy Express/ })
    await user.type(screen.getByLabelText('Search service'), 'galle')

    await waitFor(() => expect(screen.queryByRole('row', { name: /Kandy Express/ })).not.toBeInTheDocument())
    expect(screen.getByRole('row', { name: /Galle Local/ })).toBeInTheDocument()
  })

  it('shows the empty state when the operations feed has no journeys', async () => {
    vi.mocked(getJourneys).mockResolvedValue([])

    renderBoard()

    expect(await screen.findByRole('heading', { name: 'No journeys for this date' })).toBeInTheDocument()
    expect(screen.getByText('The timetable has no journeys for this railway day.')).toBeInTheDocument()
  })

  it('shows the no-matches state when the filters remove every loaded journey', async () => {
    const user = userEvent.setup()
    vi.mocked(getJourneys).mockResolvedValue([kandy])

    renderBoard()

    await screen.findByRole('row', { name: /Kandy Express/ })
    await user.type(screen.getByLabelText('Search service'), 'galle')

    expect(await screen.findByRole('heading', { name: 'No matching journeys' })).toBeInTheDocument()
    expect(screen.getByText('Try another status or clear the search.')).toBeInTheDocument()
  })

  it('shows the error state and a retry when the board cannot load', async () => {
    vi.mocked(getJourneys).mockRejectedValue(new Error('Feed down'))

    renderBoard()

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('sends a role the API refuses to the existing forbidden page, not a retryable error', async () => {
    vi.mocked(getJourneys).mockRejectedValue(
      new ApiError(403, 'FORBIDDEN_ROLE', 'The operations read needs the Network Controller role.'),
    )

    renderBoard('auditor')

    expect(await screen.findByRole('heading', { name: "You don't have access to this page" })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('403')
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('renders the read-only variant for an auditor without write affordances', async () => {
    vi.mocked(getJourneys).mockResolvedValue([kandy])

    renderBoard('auditor', true)

    expect(screen.getByRole('heading', { name: 'Live board' })).toBeInTheDocument()
    expect(screen.getByText(`Journeys for ${railwayDateKey(new Date())}`)).toBeInTheDocument()
    expect(screen.queryByText(/updates arrive automatically/)).not.toBeInTheDocument()
    expect(await rowFor('Kandy Express')).toBeInTheDocument()
    // Refreshing is a read. Nothing on the board publishes a change, whatever the role.
    expect(screen.queryByRole('link', { name: /publish/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /publish|delay|cancel|terminate|platform/i })).not.toBeInTheDocument()
  })
})
