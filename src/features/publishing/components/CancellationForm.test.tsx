import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import CancellationForm from './CancellationForm'

describe('CancellationForm', () => {
  it('names the journey, its departure and what the cancellation does', () => {
    render(<CancellationForm serviceName="Kandy Express" scheduledDeparture="2026-10-28T02:00:00Z" />)

    expect(screen.getByRole('heading', { name: 'Cancel Kandy Express?' })).toBeInTheDocument()
    expect(
      screen.getByText(/Kandy Express departs 07:30 and has not left yet\./),
    ).toBeInTheDocument()
    expect(screen.getByText(/takes effect on every channel at once/)).toBeInTheDocument()
  })

  it('says a journey that has departed cannot be cancelled', () => {
    render(<CancellationForm serviceName="Kandy Express" scheduledDeparture={null} />)

    expect(screen.getByText(/has not left yet/)).toBeInTheDocument()
    expect(screen.getByText(/A journey that has departed cannot be cancelled\./)).toBeInTheDocument()
  })

  it('warns that the cancellation cannot be undone and that a mistake is corrected, not reversed', () => {
    render(<CancellationForm serviceName="Kandy Express" scheduledDeparture={null} />)

    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()
    expect(
      screen.getByText('A mistake is fixed with a correction, not by reversing the cancellation.'),
    ).toBeInTheDocument()
  })
})
