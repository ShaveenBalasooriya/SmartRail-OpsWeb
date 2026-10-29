import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { ChangeView } from '../lib/changeHistory'
import ChangeHistory from './ChangeHistory'

const delayView: ChangeView = {
  id: 'c-delay',
  type: 'delay',
  typeLabel: 'Delay',
  summary: 'Delay of 15 minutes from stop 2',
  publisher: 'Nimalka Silva',
  // 02:40Z is 08:10 on the railway clock.
  publishedAt: '2026-10-28T02:40:00Z',
  provenanceLabel: 'Automatically published',
  isCorrected: false,
  correctsChangeId: null,
  original: null,
  correctedBy: null,
  isCorrectable: true,
}

const correctionView: ChangeView = {
  id: 'c-correction',
  type: 'correction',
  typeLabel: 'Correction',
  summary: 'Reverts the change published at 08:10',
  publisher: 'Nimalka Silva',
  // 02:50Z is 08:20 on the railway clock.
  publishedAt: '2026-10-28T02:50:00Z',
  provenanceLabel: 'Automatically published',
  isCorrected: false,
  correctsChangeId: 'c-delay',
  original: { id: 'c-delay', label: 'Delay at 08:10' },
  correctedBy: null,
  isCorrectable: false,
}

const correctedDelayView: ChangeView = {
  ...delayView,
  isCorrected: true,
  correctedBy: { id: 'c-correction', label: 'Correction at 08:20' },
  isCorrectable: false,
}

function renderHistory(props: Parameters<typeof ChangeHistory>[0]) {
  render(
    <MemoryRouter>
      <ChangeHistory {...props} />
    </MemoryRouter>,
  )
}

describe('ChangeHistory', () => {
  it('says no changes were published when the list is empty', () => {
    renderHistory({ changes: [] })

    expect(screen.getByRole('heading', { level: 2, name: 'Change history' })).toBeInTheDocument()
    expect(screen.getByText('No changes published')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('shows the type, the values summary, the provenance, the publisher and the railway publish time', () => {
    renderHistory({ changes: [delayView] })

    const item = screen.getByRole('listitem')
    expect(within(item).getByText('Delay')).toBeInTheDocument()
    expect(within(item).getByText('Delay of 15 minutes from stop 2')).toBeInTheDocument()
    expect(within(item).getByText('Automatically published')).toBeInTheDocument()
    expect(within(item).getByText('Nimalka Silva')).toBeInTheDocument()
    expect(within(item).getByText('08:10')).toHaveAttribute('datetime', '2026-10-28T02:40:00Z')
  })

  it('marks a corrected change in words', () => {
    renderHistory({ changes: [correctedDelayView] })

    expect(screen.getByText('Corrected')).toBeInTheDocument()
  })

  it('does not say corrected for a change that has not been corrected', () => {
    renderHistory({ changes: [delayView] })

    expect(screen.queryByText('Corrected')).not.toBeInTheDocument()
  })

  it('gives each change an id and links a correction to the original entry', () => {
    renderHistory({ changes: [correctionView, delayView] })

    const correction = screen.getAllByRole('listitem')[0] as HTMLElement
    expect(correction).toHaveAttribute('id', 'change-c-correction')
    expect(within(correction).getByRole('link', { name: 'Original: Delay at 08:10' })).toHaveAttribute(
      'href',
      '#change-c-delay',
    )
    expect(document.getElementById('change-c-delay')).toBeInTheDocument()
  })

  it('links a corrected change back to the correction', () => {
    renderHistory({ changes: [correctionView, correctedDelayView] })

    const corrected = screen.getByText('Corrected').closest('li') as HTMLElement
    expect(
      within(corrected).getByRole('link', { name: 'Corrected by: Correction at 08:20' }),
    ).toHaveAttribute('href', '#change-c-correction')
  })

  it('shows no links on a change with no correction on either side', () => {
    renderHistory({ changes: [delayView] })

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('lists each change in the order it is given', () => {
    renderHistory({
      changes: [
        { ...delayView, id: 'newest', typeLabel: 'Early termination', summary: 'Ends at stop 3' },
        { ...delayView, id: 'oldest', typeLabel: 'Cancellation', summary: 'Cancelled' },
      ],
    })

    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Early termination')
    expect(items[1]).toHaveTextContent('Cancellation')
  })

  describe('correction action', () => {
    it('links a correctable change to the drawer URL for that change', async () => {
      const user = userEvent.setup()
      const correctionHref = vi.fn((change: ChangeView) => `/journeys/j-1/publish/correction?changeId=${change.id}`)
      renderHistory({ changes: [delayView], correctionHref })

      const action = screen.getByRole('link', { name: 'Correct this change' })
      expect(action).toHaveAttribute('href', '/journeys/j-1/publish/correction?changeId=c-delay')

      await user.click(action)

      expect(correctionHref).toHaveBeenCalledWith(delayView)
    })

    it('keeps the history read-only when no correction URL is given', () => {
      renderHistory({ changes: [delayView] })

      expect(screen.queryByRole('link', { name: 'Correct this change' })).not.toBeInTheDocument()
    })

    it('offers no action on a change the server would refuse to correct', () => {
      renderHistory({
        changes: [{ ...delayView, isCorrectable: false }],
        correctionHref: (change) => `/journeys/j-1/publish/correction?changeId=${change.id}`,
      })

      expect(screen.queryByRole('link', { name: 'Correct this change' })).not.toBeInTheDocument()
    })
  })
})
