import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import CancellationForm from './CancellationForm'

describe('CancellationForm', () => {
  it('names the journey and says the cancellation reaches every channel at once', () => {
    render(<CancellationForm journeyName="Kandy Express" isPending={false} onSubmit={vi.fn()} />)

    expect(screen.getByText(/Cancelling Kandy Express takes effect on every channel at once/)).toBeInTheDocument()
  })

  it('asks for the cancellation with a danger button and submits once', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<CancellationForm journeyName="Kandy Express" isPending={false} onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: 'Review cancellation' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Review cancellation' }).className).toMatch(/danger/)
  })

  it('copies the button text and disables it while a publish is pending', () => {
    render(<CancellationForm journeyName="Kandy Express" isPending onSubmit={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Publishing…' })).toBeDisabled()
  })
})
