import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import PublishConfirmDialog from './PublishConfirmDialog'

type Props = Parameters<typeof PublishConfirmDialog>[0]

function renderDialog(overrides: Partial<Props> = {}) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  const props: Props = {
    isOpen: true,
    title: 'Publish this delay?',
    summary: 'Delay of 15 minutes from Stop 2: Galle.',
    publishedBy: 'Dev Network Controller',
    confirmLabel: 'Confirm delay',
    cancelLabel: 'Go back',
    isConfirming: false,
    error: null,
    onConfirm,
    onCancel,
    ...overrides,
  }
  render(<PublishConfirmDialog {...props} />)
  return { onConfirm, onCancel }
}

describe('PublishConfirmDialog', () => {
  it('states the provenance as immediate, attributed, not undoable and fixed by correction', () => {
    renderDialog()

    expect(
      screen.getByText(
        'Published immediately to every channel by Dev Network Controller. It cannot be undone; a mistake is fixed with a correction.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Delay of 15 minutes from Stop 2: Galle.')).toBeInTheDocument()
  })

  it('does not claim a provenance label before the API has reported one', () => {
    renderDialog()

    expect(screen.queryByText(/Automatically published/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Human-authored/)).not.toBeInTheDocument()
  })

  it('renders the extra audience block between the summary and the provenance', () => {
    renderDialog({ extra: <p>This reaches: Passenger app</p> })

    expect(screen.getByText('This reaches: Passenger app')).toBeInTheDocument()
  })

  it('uses the design wording for the cancel button', () => {
    renderDialog()

    expect(screen.getByRole('button', { name: 'Go back' })).toBeInTheDocument()
  })

  it('uses a primary confirm button for a delay', () => {
    renderDialog()

    const confirm = screen.getByRole('button', { name: 'Confirm delay' })
    expect(confirm.className).toMatch(/primary/)
    expect(confirm.className).not.toMatch(/danger/)
  })

  it('uses a danger confirm button for a cancellation', () => {
    renderDialog({ title: 'Cancel this journey?', confirmLabel: 'Confirm cancellation', confirmVariant: 'danger' })

    expect(screen.getByRole('button', { name: 'Confirm cancellation' }).className).toMatch(/danger/)
  })

  it('shows the publishing copy and blocks both buttons while the change is in flight', () => {
    renderDialog({ isConfirming: true })

    expect(screen.getByRole('button', { name: 'Publishing…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Go back' })).toBeDisabled()
  })

  it('shows the error as an alert inside the dialog', () => {
    renderDialog({ error: 'The change is not valid. Check the values and try again.' })

    expect(screen.getByRole('alert')).toHaveTextContent('The change is not valid. Check the values and try again.')
  })

  it('calls onConfirm and onCancel from their buttons', async () => {
    const user = userEvent.setup()
    const { onConfirm, onCancel } = renderDialog()

    await user.click(screen.getByRole('button', { name: 'Confirm delay' }))
    await user.click(screen.getByRole('button', { name: 'Go back' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
