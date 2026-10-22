import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { StopOption } from '../lib/stopOptions'
import DelayForm from './DelayForm'

const stops: StopOption[] = [
  { sequence: 2, stationId: 'st-galle', stationName: 'Galle', platformId: null, label: 'Stop 2: Galle' },
  { sequence: 3, stationId: 'st-kandy', stationName: 'Kandy', platformId: null, label: 'Stop 3: Kandy' },
]

function renderForm(props: Partial<Parameters<typeof DelayForm>[0]> = {}) {
  const onSubmit = vi.fn()
  const onDirtyChange = vi.fn()
  render(
    <DelayForm stops={stops} isPending={false} onSubmit={onSubmit} onDirtyChange={onDirtyChange} {...props} />,
  )
  return { onSubmit, onDirtyChange }
}

describe('DelayForm', () => {
  it('shows no error before the user has touched a field', () => {
    renderForm()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Review delay' })).toBeDisabled()
  })

  it('shows the minutes error after the user leaves the minutes field', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Delay in minutes'), '0')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await user.tab()

    expect(screen.getByRole('alert')).toHaveTextContent('Enter a whole number of minutes from 1 to 720.')
    expect(screen.getByLabelText('Delay in minutes')).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows the stop error after the user leaves the stop field without choosing one', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByLabelText('Delay starts at stop'))
    await user.tab()

    expect(screen.getByRole('alert')).toHaveTextContent('Choose the stop the delay starts at.')
  })

  it('enables the review button only once the form is valid, and submits the trimmed values', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()

    await user.selectOptions(screen.getByLabelText('Delay starts at stop'), 'Stop 2: Galle')
    expect(screen.getByRole('button', { name: 'Review delay' })).toBeDisabled()

    await user.type(screen.getByLabelText('Delay in minutes'), '  15 ')
    expect(screen.getByRole('button', { name: 'Review delay' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Review delay' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({ fromSequence: 2, minutes: 15 })
  })

  it.each(['1.5', '721', ''])('keeps the review button disabled for the minutes %j', async (minutes) => {
    const user = userEvent.setup()
    renderForm()

    await user.selectOptions(screen.getByLabelText('Delay starts at stop'), 'Stop 3: Kandy')
    if (minutes !== '') {
      await user.type(screen.getByLabelText('Delay in minutes'), minutes)
    }

    expect(screen.getByRole('button', { name: 'Review delay' })).toBeDisabled()
  })

  it('reports dirty as soon as a field has a value, and clean again when it is emptied', async () => {
    const user = userEvent.setup()
    const { onDirtyChange } = renderForm()

    expect(onDirtyChange).toHaveBeenLastCalledWith(false)

    await user.type(screen.getByLabelText('Delay in minutes'), '5')
    expect(onDirtyChange).toHaveBeenLastCalledWith(true)

    await user.clear(screen.getByLabelText('Delay in minutes'))
    expect(onDirtyChange).toHaveBeenLastCalledWith(false)
  })

  it('copies the button text and disables it while a publish is pending', () => {
    renderForm({ isPending: true })

    expect(screen.getByRole('button', { name: 'Publishing…' })).toBeDisabled()
  })
})
