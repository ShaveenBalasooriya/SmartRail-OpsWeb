import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ChangeView } from '../lib/changeHistory'
import ChangeHistory from './ChangeHistory'

const delayView: ChangeView = {
  id: 'c-delay',
  typeLabel: 'Delay',
  summary: 'Delay of 15 minutes from stop 2',
  publisher: 'Dev Network Controller',
  // 02:40Z is 08:10 on the railway clock.
  publishedAt: '2026-10-21T02:40:00Z',
  provenanceLabel: 'Automatically published',
  isCorrected: false,
}

describe('ChangeHistory', () => {
  it('says no changes were published when the list is empty', () => {
    render(<ChangeHistory changes={[]} />)

    expect(screen.getByRole('heading', { level: 2, name: 'Change history' })).toBeInTheDocument()
    expect(screen.getByText('No changes published')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('shows the type, the values summary, the publisher, the railway publish time and the provenance as text', () => {
    render(<ChangeHistory changes={[delayView]} />)

    const item = screen.getByRole('listitem')
    expect(within(item).getByText('Delay')).toBeInTheDocument()
    expect(within(item).getByText('Delay of 15 minutes from stop 2')).toBeInTheDocument()
    expect(within(item).getByText(/Published by Dev Network Controller at/)).toBeInTheDocument()
    expect(within(item).getByText('08:10')).toHaveAttribute('datetime', '2026-10-21T02:40:00Z')
    expect(within(item).getByText('Automatically published')).toBeInTheDocument()
  })

  it('marks a corrected change in words', () => {
    render(<ChangeHistory changes={[{ ...delayView, isCorrected: true }]} />)

    expect(screen.getByText('Corrected')).toBeInTheDocument()
  })

  it('does not say corrected for a change that has not been corrected', () => {
    render(<ChangeHistory changes={[delayView]} />)

    expect(screen.queryByText('Corrected')).not.toBeInTheDocument()
  })

  it('lists each change in the order it is given', () => {
    render(
      <ChangeHistory
        changes={[
          { ...delayView, id: 'newest', typeLabel: 'Early termination', summary: 'Last stop served: stop 3' },
          { ...delayView, id: 'oldest', typeLabel: 'Cancellation', summary: 'Journey cancelled' },
        ]}
      />,
    )

    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Early termination')
    expect(items[1]).toHaveTextContent('Cancellation')
  })
})
