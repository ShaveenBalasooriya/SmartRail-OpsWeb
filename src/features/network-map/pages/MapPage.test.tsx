import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getJourneys } from '@/features/journeys/api/journeys'
import type { Journey } from '@/features/journeys/types'
import { getLines } from '@/features/stations/api/lines'
import type { Line } from '@/features/stations/types'
import MapPage from './MapPage'

vi.mock('@/features/stations/api/lines')
vi.mock('@/features/journeys/api/journeys')

// The seeded network's shape: two lines of five stations sharing the Colombo Fort interchange.
const coastal: Line = {
  id: 'line-coa',
  code: 'COA',
  color: '#1d4ed8',
  name: 'Coastal Line',
  stations: [
    { stationId: 'st-colombo-fort', code: 'CMB', name: 'Colombo Fort', sequence: 1 },
    { stationId: 'st-kollupitiya', code: 'KLP', name: 'Kollupitiya', sequence: 2 },
    { stationId: 'st-bambalapitiya', code: 'BMB', name: 'Bambalapitiya', sequence: 3 },
    { stationId: 'st-wellawatte', code: 'WLT', name: 'Wellawatte', sequence: 4 },
    { stationId: 'st-mount-lavinia', code: 'MLV', name: 'Mount Lavinia', sequence: 5 },
  ],
}

const main: Line = {
  id: 'line-mai',
  code: 'MAI',
  color: '#0f766e',
  name: 'Main Line',
  stations: [
    { stationId: 'st-colombo-fort', code: 'CMB', name: 'Colombo Fort', sequence: 1 },
    { stationId: 'st-maradana', code: 'MDA', name: 'Maradana', sequence: 2 },
    { stationId: 'st-dematagoda', code: 'DMT', name: 'Dematagoda', sequence: 3 },
    { stationId: 'st-kelaniya', code: 'KLN', name: 'Kelaniya', sequence: 4 },
    { stationId: 'st-ragama', code: 'RGM', name: 'Ragama', sequence: 5 },
  ],
}

function journey(overrides: Partial<Journey> & Pick<Journey, 'id' | 'status'>): Journey {
  return {
    serviceName: 'Coastal Express',
    lineCode: 'COA',
    lineName: 'Coastal Line',
    direction: 'outbound',
    delayMinutes: 0,
    lastDepartedStation: null,
    nextStation: null,
    guardName: null,
    lastUpdatedAt: '2026-10-28T02:35:00Z',
    isStale: false,
    ...overrides,
  }
}

const coastalExpress = journey({
  id: 'j-coastal',
  serviceName: 'Coastal Express',
  status: 'running',
  delayMinutes: -2,
  lastDepartedStation: { id: 'st-kollupitiya', name: 'Kollupitiya' },
  nextStation: { id: 'st-bambalapitiya', name: 'Bambalapitiya' },
})

const mainLineExpress = journey({
  id: 'j-main',
  serviceName: 'Main Line Express',
  lineCode: 'MAI',
  lineName: 'Main Line',
  status: 'running',
  delayMinutes: 3,
  isStale: true,
  lastDepartedStation: { id: 'st-maradana', name: 'Maradana' },
  nextStation: { id: 'st-dematagoda', name: 'Dematagoda' },
})

const mountLocal = journey({
  id: 'j-mount',
  serviceName: 'Mount Local',
  status: 'terminated',
  delayMinutes: 8,
  lastDepartedStation: { id: 'st-mount-lavinia', name: 'Mount Lavinia' },
})

const scheduled = journey({
  id: 'j-scheduled',
  serviceName: 'Scheduled Express',
  status: 'scheduled',
  lastDepartedStation: null,
  nextStation: { id: 'st-colombo-fort', name: 'Colombo Fort' },
})

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MapPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function rowFor(name: string): Promise<HTMLElement> {
  return screen.findByRole('row', { name: new RegExp(name) })
}

describe('MapPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getLines).mockResolvedValue([coastal, main])
    vi.mocked(getJourneys).mockResolvedValue([coastalExpress, mainLineExpress, mountLocal])
  })

  it('heads the page with the design title and the lines the network actually has', async () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Network map' })).toBeInTheDocument()
    expect(
      await screen.findByText(
        'Schematic of the Coastal Line and the Main Line with current train positions',
      ),
    ).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Refresh' })).toBeInTheDocument()
    expect(await screen.findAllByText(/Last updated/)).toHaveLength(1)
  })

  it('draws one schematic with an aria-label generated from the trains on it', async () => {
    renderPage()

    await rowFor('Coastal Express')
    const map = screen.getByRole('img')
    const label = map.getAttribute('aria-label')

    expect(label).toContain('Schematic map.')
    expect(label).toContain(
      'Coastal Express is between Kollupitiya and Bambalapitiya on the Coastal Line, 2 minutes early.',
    )
    expect(label).toContain(
      'Main Line Express is between Maradana and Dematagoda on the Main Line, 3 minutes late and stale.',
    )
    expect(label).toContain('Mount Local terminated at Mount Lavinia on the Coastal Line.')
  })

  it('gives the map a text equivalent: service link, status, position and delay', async () => {
    renderPage()

    const row = await rowFor('Coastal Express')
    expect(within(row).getByRole('link', { name: 'Coastal Express' })).toHaveAttribute(
      'href',
      '/journeys/j-coastal',
    )
    expect(within(row).getByText('Running')).toBeInTheDocument()
    expect(within(row).getByText('Between Kollupitiya and Bambalapitiya')).toBeInTheDocument()
    expect(within(row).getByText('2 min early')).toBeInTheDocument()
    expect(within(row).queryByText('Stale')).not.toBeInTheDocument()
  })

  it('shows a stale train with a dashed card and the update time, and says Stale in the table', async () => {
    renderPage()

    const row = await rowFor('Main Line Express')
    expect(within(row).getByText('Stale')).toBeInTheDocument()
    expect(within(row).getByText('3 min late')).toBeInTheDocument()
    expect(screen.getByText('Stale · updated 08:05:00')).toBeInTheDocument()
  })

  it('shows a terminated train with the terminated treatment and where it ended', async () => {
    renderPage()

    const row = await rowFor('Mount Local')
    expect(within(row).getByText('Terminated')).toBeInTheDocument()
    expect(within(row).getByText('Ended at Mount Lavinia')).toBeInTheDocument()
    expect(within(row).getByText('8 min late')).toBeInTheDocument()
    expect(screen.getByText('Terminated · ended here')).toBeInTheDocument()
  })

  it('keeps scheduled, cancelled and completed journeys off the map and out of its table', async () => {
    renderPage()

    await rowFor('Coastal Express')
    expect(screen.queryByRole('row', { name: /Scheduled Express/ })).not.toBeInTheDocument()
  })

  it('draws the network and says no trains are running when none has a position', async () => {
    vi.mocked(getJourneys).mockResolvedValue([scheduled])

    renderPage()

    expect(await screen.findByText('No trains are running.')).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAttribute(
      'aria-label',
      'Schematic map. No trains are running.',
    )
    expect(screen.queryByRole('heading', { name: 'Trains on the map' })).not.toBeInTheDocument()
  })

  it('shows the loading state while either read is pending', () => {
    vi.mocked(getLines).mockReturnValue(new Promise<Line[]>(() => undefined))

    renderPage()

    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('shows the query error and a retry when the map cannot load', async () => {
    vi.mocked(getJourneys).mockRejectedValue(new Error('Feed down'))

    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong. Please try again.',
    )
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('shows an empty state when the network has no lines', async () => {
    vi.mocked(getLines).mockResolvedValue([])

    renderPage()

    expect(await screen.findByRole('heading', { name: 'No lines in the network' })).toBeInTheDocument()
  })

  it('refreshes both reads from the one Refresh button', async () => {
    const user = userEvent.setup()
    renderPage()

    await rowFor('Coastal Express')
    await user.click(screen.getByRole('button', { name: 'Refresh' }))

    await waitFor(() => {
      expect(getLines).toHaveBeenCalledTimes(2)
      expect(getJourneys).toHaveBeenCalledTimes(2)
    })
  })
})
