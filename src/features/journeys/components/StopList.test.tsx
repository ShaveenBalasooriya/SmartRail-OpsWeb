import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { StopRow } from '../lib/journeyStops'
import StopList from './StopList'

// The railway zone is Asia/Colombo (UTC+05:30), so 02:30Z is 08:00 on the railway clock.
const rows: StopRow[] = [
  {
    sequence: 1,
    stationName: 'Kandy',
    isInterchange: true,
    isCalling: true,
    arrival: null,
    departure: '2026-10-21T02:30:00Z',
    expectedTime: null,
    isServed: true,
    platformNumber: '2',
    platformChangedAt: null,
  },
  {
    sequence: 2,
    stationName: null,
    isInterchange: false,
    isCalling: true,
    arrival: '2026-10-21T02:40:00Z',
    departure: '2026-10-21T02:41:00Z',
    expectedTime: null,
    isServed: true,
    platformNumber: null,
    platformChangedAt: null,
  },
  {
    sequence: 3,
    stationName: 'Galle',
    isInterchange: false,
    isCalling: false,
    arrival: null,
    departure: null,
    expectedTime: null,
    isServed: true,
    platformNumber: null,
    platformChangedAt: null,
  },
]

describe('StopList', () => {
  it('renders a captioned native table with scoped column headers, including the expected column', () => {
    render(<StopList rows={rows} />)

    const table = screen.getByRole('table', { name: 'Stops' })
    const headers = within(table).getAllByRole('columnheader')

    expect(headers.map((header) => header.textContent)).toEqual([
      'Stop number',
      'Station',
      'Arrives',
      'Departs',
      'Expected',
      'Platform',
    ])
    headers.forEach((header) => expect(header).toHaveAttribute('scope', 'col'))
  })

  it('shows calling times in railway time inside a time element with its machine value', () => {
    render(<StopList rows={rows} />)

    const departure = screen.getByText('08:00')
    expect(departure.tagName).toBe('TIME')
    expect(departure).toHaveAttribute('datetime', '2026-10-21T02:30:00Z')
    expect(screen.getByText('08:10')).toHaveAttribute('datetime', '2026-10-21T02:40:00Z')
  })

  it('shows a dash for a time the stop does not have, such as the origin arrival', () => {
    render(<StopList rows={rows} />)

    // The origin's arrival, the expected column of each row with no delay, and the platform of stop 2.
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3)
  })

  it('shows Passes in both time columns of a non-calling stop', () => {
    render(<StopList rows={rows} />)

    expect(screen.getAllByText('Passes')).toHaveLength(2)
  })

  it('shows the station fallback and the interchange tag as text', () => {
    render(<StopList rows={rows} />)

    expect(screen.getByText('Unknown station')).toBeInTheDocument()
    expect(screen.getByText('Interchange')).toBeInTheDocument()
  })

  it('shows the platform number of a stop that has one', () => {
    render(<StopList rows={rows} />)

    const kandyRow = screen.getByRole('row', { name: /Kandy/ })
    expect(within(kandyRow).getAllByRole('cell')[5]).toHaveTextContent('2')
  })

  it('shows the expected time of a delayed stop in railway time', () => {
    render(
      <StopList
        rows={[{ ...rows[1] as StopRow, expectedTime: '2026-10-21T02:56:00Z' }]}
      />,
    )

    const expected = screen.getByText('08:26')
    expect(expected.tagName).toBe('TIME')
    expect(expected).toHaveAttribute('datetime', '2026-10-21T02:56:00Z')
  })

  it('says Not served for a calling stop the train no longer reaches', () => {
    render(<StopList rows={[{ ...rows[1] as StopRow, isServed: false }]} />)

    const cells = screen.getByRole('row', { name: /Unknown station/ }).querySelectorAll('td')
    expect(cells[4]).toHaveTextContent('Not served')
  })

  it('shows a dash, not Not served, for a passing stop', () => {
    render(<StopList rows={[{ ...rows[2] as StopRow, isServed: false }]} />)

    const cells = screen.getByRole('row', { name: /Galle/ }).querySelectorAll('td')
    expect(cells[4]).toHaveTextContent('—')
    expect(cells[4]).not.toHaveTextContent('Not served')
  })

  it('says a platform that changed in words, with the time it changed', () => {
    render(<StopList rows={[{ ...rows[0] as StopRow, platformNumber: '3', platformChangedAt: '2026-10-21T02:45:00Z' }]} />)

    const kandyRow = screen.getByRole('row', { name: /Kandy/ })
    expect(within(kandyRow).getByText('Changed at')).toBeInTheDocument()
    expect(within(kandyRow).getByText('08:15')).toHaveAttribute('datetime', '2026-10-21T02:45:00Z')
    expect(within(kandyRow).getAllByRole('cell')[5]).toHaveTextContent('3Changed at 08:15')
  })

  it('does not say changed for a platform that was never changed', () => {
    render(<StopList rows={rows} />)

    expect(screen.queryByText(/Changed at/)).not.toBeInTheDocument()
  })
})
