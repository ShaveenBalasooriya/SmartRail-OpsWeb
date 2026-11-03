import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { JourneyDetail } from '../types'
import JourneyDetailHeader from './JourneyDetailHeader'

// 02:35Z is 08:05 on the railway clock.
const journey: JourneyDetail = {
  id: '0196f2a0-0000-7000-8000-000000000001',
  serviceName: 'Kandy Express',
  lineCode: 'KDY',
  lineName: 'Main Line',
  direction: 'outbound',
  status: 'running',
  delayMinutes: 15,
  lastDepartedStation: { id: 'st-kandy', name: 'Kandy' },
  nextStation: { id: 'st-galle', name: 'Galle' },
  guardName: 'Nimal Perera',
  lastUpdatedAt: '2026-10-28T02:35:00Z',
  isStale: false,
  stops: [
    {
      sequence: 1,
      stationId: 'st-kandy',
      stationName: 'Kandy',
      isCalling: true,
      scheduledArrival: null,
      scheduledDeparture: '2026-10-28T02:40:00Z',
      expectedArrival: null,
      expectedDeparture: null,
      actualDeparture: null,
      platformId: null,
      platformNumber: null,
    },
  ],
  changes: [],
}

describe('JourneyDetailHeader', () => {
  it('shows the line, direction, status, early or late pill and guard', () => {
    render(<JourneyDetailHeader journey={journey} />)

    expect(screen.getByText('KDY Main Line')).toBeInTheDocument()
    expect(screen.getByText('Outbound')).toBeInTheDocument()
    expect(screen.getByText('Running')).toBeInTheDocument()
    expect(screen.getByText('15 min late')).toBeInTheDocument()
    expect(screen.getByText('Nimal Perera')).toBeInTheDocument()
  })

  it("shows the first calling stop's scheduled departure in railway time", () => {
    render(<JourneyDetailHeader journey={journey} />)

    const departure = screen.getByText('08:10')
    expect(departure.tagName).toBe('TIME')
    expect(departure).toHaveAttribute('datetime', '2026-10-28T02:40:00Z')
    expect(screen.getByText('Scheduled departure')).toBeInTheDocument()
  })

  it('does not show a service date, because the API does not report one', () => {
    render(<JourneyDetailHeader journey={journey} />)

    expect(screen.queryByText('Service date')).not.toBeInTheDocument()
  })

  it('renders a dash for the facts the API did not supply', () => {
    const { container } = render(
      <JourneyDetailHeader
        journey={{
          ...journey,
          direction: null,
          delayMinutes: null,
          guardName: null,
          stops: [],
        }}
      />,
    )

    // Direction, scheduled departure, the delay pill and the guard.
    expect(screen.getAllByText('—')).toHaveLength(4)
    expect(container.querySelector('dl')).not.toBeNull()
  })

  it('renders no heading, because the page owns the h1', () => {
    render(<JourneyDetailHeader journey={journey} />)

    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })
})
