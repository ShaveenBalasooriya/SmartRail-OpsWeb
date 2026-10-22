import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import JourneyStatusBadge from './JourneyStatusBadge'

describe('JourneyStatusBadge', () => {
  it('says "Not reported" when the timetable gave no live status', () => {
    render(<JourneyStatusBadge status={null} />)

    expect(screen.getByText('Not reported')).toBeInTheDocument()
  })

  it('shows the status as a text label, not colour alone', () => {
    render(<JourneyStatusBadge status="running" />)

    expect(screen.getByText('Running')).toBeInTheDocument()
  })
})

describe('JourneyStatusBadge for every status', () => {
  it.each([
    ['scheduled', 'Scheduled'],
    ['running', 'Running'],
    ['cancelled', 'Cancelled'],
    ['terminated', 'Terminated'],
    ['completed', 'Completed'],
  ] as const)('labels the %s status as text', (status, label) => {
    render(<JourneyStatusBadge status={status} />)

    expect(screen.getByText(label)).toBeInTheDocument()
  })
})
