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
    confirmLabel: 'Publish delay',
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
  it('states the provenance: immediate, attributed, labelled and not undoable', () => {
    renderDialog()

    expect(
      screen.getByText(
        'Published immediately to every channel. Published by Dev Network Controller, labelled "Automatically published". Cannot be undone; a mistake is fixed with a correction.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Delay of 15 minutes from Stop 2: Galle.')).toBeInTheDocument()
  })

  it('uses a primary confirm button for a delay', () => {
    renderDialog()

    const confirm = screen.getByRole('button', { name: 'Publish delay' })
    expect(confirm.className).toMatch(/primary/)
    expect(confirm.className).not.toMatch(/danger/)
  })

  it('uses a danger confirm button for a cancellation', () => {
    renderDialog({ title: 'Cancel this journey?', confirmLabel: 'Cancel journey', confirmVariant: 'danger' })

    expect(screen.getByRole('button', { name: 'Cancel journey' }).className).toMatch(/danger/)
  })

  it('shows the publishing copy and blocks both buttons while the change is in flight', () => {
    renderDialog({ isConfirming: true })

    expect(screen.getByRole('button', { name: 'Publishing…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })

  it('shows the error as an alert inside the dialog', () => {
    renderDialog({ error: 'The change is not valid. Check the values and try again.' })

    expect(screen.getByRole('alert')).toHaveTextContent('The change is not valid. Check the values and try again.')
  })

  it('calls onConfirm and onCancel from their buttons', async () => {
    const user = userEvent.setup()
    const { onConfirm, onCancel } = renderDialog()

    await user.click(screen.getByRole('button', { name: 'Publish delay' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
