import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { StopRow } from '../lib/journeyStops'
import StopList from './StopList'

// The railway zone is Asia/Colombo (UTC+05:30), so 02:30Z is 08:00 on the railway clock.
const rows: StopRow[] = [
  {
    sequence: 1,
    stationId: 'st-kandy',
    stationName: 'Kandy',
    isCalling: true,
    state: 'departed',
    scheduled: '2026-10-28T02:30:00Z',
    expected: '2026-10-28T02:45:00Z',
    actualDeparture: '2026-10-28T02:31:00Z',
    platformNumber: '2',
    platformChangedAt: null,
  },
  {
    sequence: 2,
    stationId: 'st-colombo',
    stationName: 'Colombo Fort',
    isCalling: true,
    state: 'next',
    scheduled: '2026-10-28T02:40:00Z',
    expected: '2026-10-28T02:56:00Z',
    actualDeparture: null,
    platformNumber: '3',
    platformChangedAt: '2026-10-28T02:20:00Z',
  },
  {
    sequence: 3,
    stationId: 'st-galle',
    stationName: 'Galle',
    isCalling: false,
    state: 'notCalling',
    scheduled: null,
    expected: null,
    actualDeparture: null,
    platformNumber: null,
    platformChangedAt: null,
  },
  {
    sequence: 4,
    stationId: 'st-nawalapitiya',
    stationName: 'Nawalapitiya',
    isCalling: true,
    state: 'upcoming',
    scheduled: '2026-10-28T02:50:00Z',
    expected: '2026-10-28T03:05:00Z',
    actualDeparture: null,
    platformNumber: null,
    platformChangedAt: null,
  },
  {
    sequence: 5,
    stationId: 'st-badulla',
    stationName: 'Badulla',
    isCalling: true,
    state: 'notServed',
    scheduled: '2026-10-28T03:00:00Z',
    expected: '2026-10-28T03:10:00Z',
    actualDeparture: null,
    platformNumber: '1',
    platformChangedAt: null,
  },
]

describe('StopList', () => {
  it('renders a captioned native table with scoped column headers for the design columns', () => {
    render(<StopList rows={rows} />)

    const table = screen.getByRole('table', { name: 'Stop timeline' })
    const headers = within(table).getAllByRole('columnheader')

    expect(headers.map((header) => header.textContent)).toEqual([
      'Progress',
      'Station',
      'Scheduled',
      'Expected',
      'Actual departure',
      'Platform',
    ])
    headers.forEach((header) => expect(header).toHaveAttribute('scope', 'col'))
  })

  it('shows the scheduled and expected times in railway time inside a time element with the machine value', () => {
    render(<StopList rows={rows} />)

    const scheduled = screen.getByText('08:00')
    expect(scheduled.tagName).toBe('TIME')
    expect(scheduled).toHaveAttribute('datetime', '2026-10-28T02:30:00Z')
    expect(screen.getByText('08:15')).toHaveAttribute('datetime', '2026-10-28T02:45:00Z')
    expect(screen.getByText('08:01')).toHaveAttribute('datetime', '2026-10-28T02:31:00Z')
  })

  it('labels the state dot for each calling stop', () => {
    render(<StopList rows={rows} />)

    expect(screen.getByRole('img', { name: 'Departed' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Next stop' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Upcoming' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Not served' })).toBeInTheDocument()
  })

  it('tags the next calling stop in words', () => {
    render(<StopList rows={rows} />)

    const nextRow = screen.getByRole('row', { name: /Colombo Fort/ })
    expect(within(nextRow).getByText('Next stop')).toBeInTheDocument()
    expect(screen.getAllByText('Next stop')).toHaveLength(1)
  })

  it('adds the time of a platform change under the platform number', () => {
    render(<StopList rows={rows} />)

    const nextRow = screen.getByRole('row', { name: /Colombo Fort/ })
    const platformCell = within(nextRow).getAllByRole('cell')[5] as HTMLElement
    expect(platformCell).toHaveTextContent('3')
    expect(platformCell).toHaveTextContent('Changed at 07:50')
    expect(within(platformCell).getByText('07:50')).toHaveAttribute(
      'datetime',
      '2026-10-28T02:20:00Z',
    )
  })

  it('says a non-calling stop does not stop and prints dashes for its times', () => {
    render(<StopList rows={rows} />)

    const galleRow = screen.getByRole('row', { name: /Galle/ })
    expect(within(galleRow).getByText('Does not stop')).toBeInTheDocument()
    // Scheduled, expected, actual departure and platform.
    expect(within(galleRow).getAllByText('—')).toHaveLength(4)
  })

  it('marks a stop after an early termination as not served', () => {
    render(<StopList rows={rows} />)

    const badullaRow = screen.getByRole('row', { name: /Badulla/ })
    const cells = within(badullaRow).getAllByRole('cell')
    expect(cells[3]).toHaveTextContent('Not served')
    expect(cells[4]).toHaveTextContent('—')
    expect(within(badullaRow).getByText('Not served', { selector: 'span' })).toBeInTheDocument()
  })

  it('shows the station name from the response, and a visible fallback when the API sent none', () => {
    render(<StopList rows={[{ ...rows[0], stationName: null }]} />)

    expect(screen.getByText('Unknown station')).toBeInTheDocument()
  })

  it('tags the interchange stops the network reference data names, and only those', () => {
    render(<StopList rows={rows} interchangeStationIds={new Set(['st-colombo'])} />)

    const colomboRow = screen.getByRole('row', { name: /Colombo Fort/ })
    expect(within(colomboRow).getByText('Interchange')).toBeInTheDocument()
    expect(screen.getAllByText('Interchange')).toHaveLength(1)
    expect(within(screen.getByRole('row', { name: /Kandy/ })).queryByText('Interchange')).not.toBeInTheDocument()
  })

  it('renders every stop without tags while the station reference data is not available', () => {
    render(<StopList rows={rows} />)

    expect(screen.queryByText('Interchange')).not.toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(rows.length + 1)
  })
})
