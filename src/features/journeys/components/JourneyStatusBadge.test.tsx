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
