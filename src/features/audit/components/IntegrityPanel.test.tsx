import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { checkIntegrity } from '../api/audit'
import IntegrityPanel from './IntegrityPanel'

vi.mock('../api/audit')

function renderPanel() {
  const queryClient = new QueryClient()

  render(
    <QueryClientProvider client={queryClient}>
      <IntegrityPanel />
    </QueryClientProvider>,
  )
}

describe('IntegrityPanel', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('reports an intact chain after the check', async () => {
    const user = userEvent.setup()
    vi.mocked(checkIntegrity).mockResolvedValue({ status: 'intact', entriesChecked: 12 })

    renderPanel()
    await user.click(screen.getByRole('button', { name: 'Check integrity' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Chain intact, 12 entries checked')
  })

  it('reports a broken chain as an alert with the failing position', async () => {
    const user = userEvent.setup()
    vi.mocked(checkIntegrity).mockResolvedValue({
      status: 'broken',
      firstFailingPosition: 3,
      entriesChecked: 12,
    })

    renderPanel()
    await user.click(screen.getByRole('button', { name: 'Check integrity' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Chain broken at position 3 (12 entries checked)',
    )
  })

  it('disables the button while the check runs', async () => {
    const user = userEvent.setup()
    vi.mocked(checkIntegrity).mockReturnValue(new Promise(() => {}))

    renderPanel()
    await user.click(screen.getByRole('button', { name: 'Check integrity' }))

    expect(screen.getByRole('button', { name: 'Checking…' })).toBeDisabled()
  })

  it('shows the API message and retries after a failure', async () => {
    const user = userEvent.setup()
    vi.mocked(checkIntegrity)
      .mockRejectedValueOnce(new Error('The audit record is unavailable.'))
      .mockResolvedValueOnce({ status: 'intact', entriesChecked: 4 })

    renderPanel()
    await user.click(screen.getByRole('button', { name: 'Check integrity' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('The audit record is unavailable.')

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Chain intact, 4 entries checked')
  })
})
