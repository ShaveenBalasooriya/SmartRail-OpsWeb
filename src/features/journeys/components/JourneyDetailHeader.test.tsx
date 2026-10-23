import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { JourneyDetail } from '../types'
import JourneyDetailHeader from './JourneyDetailHeader'

const journey: JourneyDetail = {
  id: '0196f2a0-0000-7000-8000-000000000001',
  serviceName: 'Kandy Express',
  lineCode: 'KDY',
  lineName: 'Main Line',
  direction: 'outbound',
  scheduledDepartureAt: '2026-10-21T02:30:00Z',
  status: null,
  serviceDate: '2026-10-21',
  stops: [],
}

describe('JourneyDetailHeader', () => {
  it('shows the line, direction, service date and status', () => {
    render(<JourneyDetailHeader journey={journey} />)

    expect(screen.getByText('KDY Main Line')).toBeInTheDocument()
    expect(screen.getByText('Outbound')).toBeInTheDocument()
    expect(screen.getByText('2026-10-21')).toBeInTheDocument()
    expect(screen.getByText('Not reported')).toBeInTheDocument()
  })

  it('shows the scheduled departure in railway time with its machine value', () => {
    render(<JourneyDetailHeader journey={journey} />)

    const departure = screen.getByText('08:00')
    expect(departure.tagName).toBe('TIME')
    expect(departure).toHaveAttribute('datetime', '2026-10-21T02:30:00Z')
  })

  it('renders no heading, because the page owns the h1', () => {
    render(<JourneyDetailHeader journey={journey} />)

    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })
})
