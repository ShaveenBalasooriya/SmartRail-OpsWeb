import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { recordChange, resetMockChanges } from '@/features/publishing/api/mockChangeStore'
import type { PublishedChange } from '@/features/publishing/types'
import { getJourneys } from '../api/journeys'
import type { Journey } from '../types'
import LiveBoardPage from './LiveBoardPage'

vi.mock('../api/journeys')

const kandy: Journey = {
  id: '0196f2a0-0000-7000-8000-000000000001',
  serviceName: 'Kandy Express',
  lineCode: 'KDY',
  lineName: 'Main Line',
  direction: 'outbound',
  scheduledDepartureAt: '2026-10-21T02:30:00Z',
  status: null,
}

const galle: Journey = {
  id: '0196f2a0-0000-7000-8000-000000000002',
  serviceName: 'Galle Local',
  lineCode: 'GLE',
  lineName: 'Coastal Line',
  direction: 'inbound',
  scheduledDepartureAt: '2026-10-21T03:10:00Z',
  status: null,
}

function changeOn(journeyId: string, type: PublishedChange['type']): PublishedChange {
  return {
    id: `c-${type}-${journeyId}`,
    type,
    journeyId,
    values: type === 'termination' ? { lastStopSequence: 2 } : {},
    publishedBy: 'Dev Network Controller',
    publishedAt: '2026-10-21T02:40:00Z',
    provenance: 'automatically_published',
    correctedByChangeId: null,
    correctsChangeId: null,
  }
}

function renderBoard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LiveBoardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function rowFor(name: string): Promise<HTMLElement> {
  return screen.findByRole('row', { name: new RegExp(name) })
}

describe('LiveBoardPage status from published changes', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    resetMockChanges()
    vi.stubEnv('VITE_USE_REAL_OPERATIONS', undefined)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('shows a cancelled journey as Cancelled on the board, and the other journey as not reported', async () => {
    vi.mocked(getJourneys).mockResolvedValue([kandy, galle])
    recordChange(changeOn(kandy.id, 'cancellation'))

    renderBoard()

    expect(await within(await rowFor('Kandy Express')).findByText('Cancelled')).toBeInTheDocument()
    expect(within(await rowFor('Galle Local')).getByText('Not reported')).toBeInTheDocument()
  })

  it('shows a terminated journey as Terminated on the board', async () => {
    vi.mocked(getJourneys).mockResolvedValue([kandy])
    recordChange(changeOn(kandy.id, 'termination'))

    renderBoard()

    expect(await within(await rowFor('Kandy Express')).findByText('Terminated')).toBeInTheDocument()
  })

  it('says only the journeys with a published change show a status, when only some do', async () => {
    vi.mocked(getJourneys).mockResolvedValue([kandy, galle])
    recordChange(changeOn(kandy.id, 'cancellation'))

    renderBoard()

    expect(
      await screen.findByText('Only journeys with a published change show a status. The others show Not reported.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Live status is not available yet, so status filters match nothing. Scheduled times are shown.'),
    ).not.toBeInTheDocument()
  })

  it('still says live status is not available when no journey has a published change', async () => {
    vi.mocked(getJourneys).mockResolvedValue([kandy, galle])

    renderBoard()

    expect(
      await screen.findByText(
        'Live status is not available yet, so status filters match nothing. Scheduled times are shown.',
      ),
    ).toBeInTheDocument()
  })

  it('keeps the timetable status, and does not read the mock store, once the operations group is real', async () => {
    vi.stubEnv('VITE_USE_REAL_OPERATIONS', 'true')
    vi.mocked(getJourneys).mockResolvedValue([kandy])
    recordChange(changeOn(kandy.id, 'cancellation'))

    renderBoard()

    expect(await within(await rowFor('Kandy Express')).findByText('Not reported')).toBeInTheDocument()
    expect(within(await rowFor('Kandy Express')).queryByText('Cancelled')).not.toBeInTheDocument()
  })
})
