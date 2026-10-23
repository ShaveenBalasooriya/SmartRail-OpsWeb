import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { JourneyStatus } from '@/features/journeys/types'
import PublishActions from './PublishActions'

const STATUSES: (JourneyStatus | null)[] = [null, 'scheduled', 'running', 'cancelled', 'terminated', 'completed']

// The spec's matrix, written out in full so every status against every action is checked.
const EXPECTED: Record<string, string[]> = {
  'not reported': ['Publish a delay', 'Cancel journey', 'Change a platform', 'Early termination'],
  scheduled: ['Publish a delay', 'Cancel journey', 'Change a platform'],
  running: ['Publish a delay', 'Change a platform', 'Early termination'],
  cancelled: [],
  terminated: [],
  completed: [],
}

function renderActions(status: JourneyStatus | null, canPublish = true) {
  render(
    <MemoryRouter>
      <PublishActions journeyId="j-1" serviceDate="2026-10-21" status={status} canPublish={canPublish} />
    </MemoryRouter>,
  )
}

function visibleLabels(): string[] {
  return screen.queryAllByRole('link').map((link) => link.textContent ?? '')
}

function keyOf(status: JourneyStatus | null): string {
  return status ?? 'not reported'
}

describe('PublishActions', () => {
  it.each(STATUSES)('offers the right actions for status %j', (status) => {
    renderActions(status)

    expect(visibleLabels()).toEqual(EXPECTED[keyOf(status)])
  })

  it.each(STATUSES)('renders nothing for an auditor, whatever the status %j', (status) => {
    renderActions(status, false)

    expect(screen.queryByRole('heading', { name: 'Publish a change' })).not.toBeInTheDocument()
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })

  it('offers no action on a cancelled or terminated journey, so no heading is shown either', () => {
    renderActions('terminated')

    expect(screen.queryByRole('heading', { name: 'Publish a change' })).not.toBeInTheDocument()
  })

  it('links each action to its publish route and keeps the service date', () => {
    renderActions('scheduled')

    expect(screen.getByRole('link', { name: 'Publish a delay' })).toHaveAttribute(
      'href',
      '/journeys/j-1/publish/delay?date=2026-10-21',
    )
    expect(screen.getByRole('link', { name: 'Cancel journey' })).toHaveAttribute(
      'href',
      '/journeys/j-1/publish/cancellation?date=2026-10-21',
    )
    expect(screen.getByRole('link', { name: 'Change a platform' })).toHaveAttribute(
      'href',
      '/journeys/j-1/publish/platform-change?date=2026-10-21',
    )
  })

  it('links the early termination action to its route', () => {
    renderActions('running')

    expect(screen.getByRole('link', { name: 'Early termination' })).toHaveAttribute(
      'href',
      '/journeys/j-1/publish/termination?date=2026-10-21',
    )
  })
})
