import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import StationName from './StationName'

describe('StationName', () => {
  it('renders the station name', () => {
    render(<StationName name="Kandy" />)

    expect(screen.getByText('Kandy')).toBeInTheDocument()
    expect(screen.queryByText('Interchange')).not.toBeInTheDocument()
  })

  it('renders a visible fallback when the name is unknown, never an empty element', () => {
    render(<StationName name={null} />)

    expect(screen.getByText('Unknown station')).toBeInTheDocument()
  })

  it('shows the Interchange tag as text when the station is an interchange', () => {
    render(<StationName name="Kandy" isInterchange />)

    expect(screen.getByText('Kandy')).toBeInTheDocument()
    expect(screen.getByText('Interchange')).toBeInTheDocument()
  })
})
