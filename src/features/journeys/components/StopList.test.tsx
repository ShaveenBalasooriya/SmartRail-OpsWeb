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
    platformNumber: '2',
  },
  {
    sequence: 2,
    stationName: null,
    isInterchange: false,
    isCalling: true,
    arrival: '2026-10-21T02:40:00Z',
    departure: '2026-10-21T02:41:00Z',
    platformNumber: null,
  },
  {
    sequence: 3,
    stationName: 'Galle',
    isInterchange: false,
    isCalling: false,
    arrival: null,
    departure: null,
    platformNumber: null,
  },
]

describe('StopList', () => {
  it('renders a captioned native table with scoped column headers', () => {
    render(<StopList rows={rows} />)

    const table = screen.getByRole('table', { name: 'Stops' })
    const headers = within(table).getAllByRole('columnheader')

    expect(headers.map((header) => header.textContent)).toEqual([
      'Stop number',
      'Station',
      'Arrives',
      'Departs',
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

    expect(screen.getAllByText('—')).toHaveLength(3)
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
    expect(within(kandyRow).getAllByRole('cell')[4]).toHaveTextContent('2')
  })
})
