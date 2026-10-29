import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ReachList from './ReachList'
import ReviewList from './ReviewList'

describe('ReachList', () => {
  it('lists the four audiences the design says a change reaches', () => {
    render(<ReachList title="This delay reaches" />)

    expect(screen.getByRole('heading', { name: 'This delay reaches' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Passenger app',
      'Station displays',
      'Guard app',
      'Catering provider',
    ])
  })

  it('renders a titled list for the review dialog, including a single stop', () => {
    render(<ReviewList title="No longer served:" items={['Stop 3: Kandy']} />)

    expect(screen.getByText('No longer served:')).toBeInTheDocument()
    expect(screen.getByRole('listitem')).toHaveTextContent('Stop 3: Kandy')
  })
})
