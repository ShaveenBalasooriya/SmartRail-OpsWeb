import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { StopOption } from '../lib/stopOptions'
import DelayForm from './DelayForm'

const LIMITS = { minMinutes: 1, maxMinutes: 720 }

const stops: StopOption[] = [
  { sequence: 2, stationId: 'st-galle', stationName: 'Galle', platformId: null, label: 'Stop 2: Galle' },
  { sequence: 3, stationId: 'st-kandy', stationName: 'Kandy', platformId: null, label: 'Stop 3: Kandy' },
]

function renderForm(props: Partial<Parameters<typeof DelayForm>[0]> = {}) {
  const onSubmit = vi.fn()
  const onDirtyChange = vi.fn()
  const onValidityChange = vi.fn()
  const onDraftChange = vi.fn()
  render(
    <DelayForm
      formId="delay-form"
      stops={stops}
      limits={LIMITS}
      onSubmit={onSubmit}
      onDirtyChange={onDirtyChange}
      onValidityChange={onValidityChange}
      onDraftChange={onDraftChange}
      {...props}
    />,
  )
  return { onSubmit, onDirtyChange, onValidityChange, onDraftChange }
}

describe('DelayForm', () => {
  it('shows no error before the user has touched a field, and reports the form invalid', () => {
    const { onValidityChange } = renderForm()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(onValidityChange).toHaveBeenLastCalledWith(false)
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

  it('reports the form valid once a stop and a whole number of minutes are chosen', async () => {
    const user = userEvent.setup()
    const { onValidityChange, onDraftChange } = renderForm()

    await user.selectOptions(screen.getByLabelText('Delay starts at stop'), 'Stop 2: Galle')
    expect(onValidityChange).toHaveBeenLastCalledWith(false)

    await user.type(screen.getByLabelText('Delay in minutes'), '15')
    expect(onValidityChange).toHaveBeenLastCalledWith(true)
    expect(onDraftChange).toHaveBeenLastCalledWith({ fromSequence: 2, minutesText: '15' })
  })

  it.each(['1.5', '721', ''])('keeps the form invalid for the minutes %j', async (minutes) => {
    const user = userEvent.setup()
    const { onValidityChange } = renderForm()

    await user.selectOptions(screen.getByLabelText('Delay starts at stop'), 'Stop 3: Kandy')
    if (minutes !== '') {
      await user.type(screen.getByLabelText('Delay in minutes'), minutes)
    }

    expect(onValidityChange).toHaveBeenLastCalledWith(false)
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
})
