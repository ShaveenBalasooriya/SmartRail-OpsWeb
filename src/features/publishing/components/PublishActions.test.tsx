import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { JourneyStatus } from '@/features/journeys/types'
import PublishActions from './PublishActions'

const ALL = ['Publish a delay', 'Cancel journey', 'Change a platform']
const NO_CANCEL = ['Publish a delay', 'Change a platform']

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

describe('PublishActions', () => {
  it.each([
    [null, ALL],
    ['scheduled', ALL],
    ['running', NO_CANCEL],
    ['cancelled', []],
    ['completed', []],
  ] as const)('offers the right actions for status %j', (status, labels) => {
    renderActions(status)

    expect(visibleLabels()).toEqual(labels)
  })

  it.each([null, 'scheduled', 'running', 'cancelled', 'completed'] as const)(
    'renders nothing for an auditor, whatever the status %j',
    (status) => {
      renderActions(status, false)

      expect(screen.queryByRole('heading', { name: 'Publish a change' })).not.toBeInTheDocument()
      expect(screen.queryAllByRole('link')).toHaveLength(0)
    },
  )

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
})
