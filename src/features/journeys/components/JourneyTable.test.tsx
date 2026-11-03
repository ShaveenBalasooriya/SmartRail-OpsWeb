import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { Journey } from '../types'
import JourneyTable from './JourneyTable'

// 02:35Z is 08:05:00 on the railway clock.
const journey: Journey = {
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

function renderTable(journeys: Journey[]) {
  render(
    <MemoryRouter>
      <JourneyTable journeys={journeys} dateLabel="2026-10-28" />
    </MemoryRouter>,
  )
}

describe('JourneyTable', () => {
  it('names the day in a visually hidden caption and uses column headers', () => {
    renderTable([journey])

    expect(screen.getByText('Journeys for 2026-10-28')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Service' })).toHaveAttribute('scope', 'col')
    expect(screen.getByRole('columnheader', { name: 'Early or late' })).toHaveAttribute('scope', 'col')
  })

  it('omits the design\'s Departs column, because the API has no departure time', () => {
    renderTable([journey])

    expect(screen.queryByRole('columnheader', { name: 'Departs' })).not.toBeInTheDocument()
  })

  it('gives each journey a link to its detail page, labelled with the service', () => {
    renderTable([journey])

    expect(screen.getByRole('link', { name: 'View Kandy Express' })).toHaveAttribute(
      'href',
      '/journeys/0196f2a0-0000-7000-8000-000000000001',
    )
  })

  it('shows the service, line, guard, live state, stations, delay and last update', () => {
    renderTable([journey])

    const row = screen.getByRole('row', { name: /Kandy Express/ })
    expect(within(row).getByText('KDY Main Line')).toBeInTheDocument()
    expect(within(row).getByText('Guard: Nimal Perera')).toBeInTheDocument()
    expect(within(row).getByText('Outbound')).toBeInTheDocument()
    expect(within(row).getByText('Running')).toBeInTheDocument()
    expect(within(row).getByText('7 min late')).toBeInTheDocument()
    expect(within(row).getByText('Kandy')).toBeInTheDocument()
    expect(within(row).getByText('Next: Galle')).toBeInTheDocument()
    expect(within(row).getByText('08:05:00')).toHaveAttribute('datetime', '2026-10-28T02:35:00Z')
  })

  it('says a journey has not departed when the API supplies no last station', () => {
    renderTable([{ ...journey, status: 'scheduled', lastDepartedStation: null, nextStation: null }])

    const row = screen.getByRole('row', { name: /Kandy Express/ })
    expect(within(row).getByText('Not yet departed')).toBeInTheDocument()
    expect(within(row).getByText('Next: —')).toBeInTheDocument()
  })

  it('says how early a journey is, not only how late', () => {
    renderTable([{ ...journey, delayMinutes: -3 }])

    expect(screen.getByText('3 min early')).toBeInTheDocument()
  })

  it('shows on time as a neutral pill', () => {
    renderTable([{ ...journey, delayMinutes: 0 }])

    expect(screen.getByText('On time')).toBeInTheDocument()
  })

  it('shows a dash in the pill when no delay is reported', () => {
    renderTable([{ ...journey, delayMinutes: null }])

    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('marks a stale row with its highlight style and the word Stale', () => {
    renderTable([{ ...journey, isStale: true }])

    const row = screen.getByRole('row', { name: /Kandy Express/ })
    expect(row.className).toContain('rowStale')
    expect(within(row).getByText('Stale')).toBeInTheDocument()
  })

  it('does not mark a fresh row as stale', () => {
    renderTable([journey])

    const row = screen.getByRole('row', { name: /Kandy Express/ })
    expect(row.className).not.toContain('rowStale')
    expect(screen.queryByText('Stale')).not.toBeInTheDocument()
  })

  it('shows a visible dash for the values the API did not supply', () => {
    renderTable([
      {
        ...journey,
        direction: null,
        delayMinutes: null,
        lastDepartedStation: null,
        nextStation: null,
        guardName: null,
      },
    ])

    const row = screen.getByRole('row', { name: /Kandy Express/ })
    // The direction and the delay pill both fall back to a dash.
    expect(within(row).getAllByText('—')).toHaveLength(2)
    expect(within(row).queryByText(/^Guard:/)).not.toBeInTheDocument()
  })
})
