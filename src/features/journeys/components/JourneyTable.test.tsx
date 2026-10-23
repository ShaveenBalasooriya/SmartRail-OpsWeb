import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { Journey } from '../types'
import JourneyTable from './JourneyTable'

const journey: Journey = {
  id: '0196f2a0-0000-7000-8000-000000000001',
  serviceName: 'Kandy Express',
  lineCode: 'KDY',
  lineName: 'Main Line',
  direction: 'outbound',
  scheduledDepartureAt: '2026-10-21T02:30:00Z',
  status: null,
}

describe('JourneyTable', () => {
  it('makes the service name a link to the detail page for the board day', () => {
    render(
      <MemoryRouter>
        <JourneyTable journeys={[journey]} serviceDate="2026-10-21" />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Kandy Express' })).toHaveAttribute(
      'href',
      '/journeys/0196f2a0-0000-7000-8000-000000000001?date=2026-10-21',
    )
  })
})
