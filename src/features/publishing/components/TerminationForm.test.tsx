import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { StopOption } from '../lib/stopOptions'
import TerminationForm from './TerminationForm'

const stops: StopOption[] = [
  { sequence: 2, stationId: 'st-galle', stationName: 'Galle', platformId: null, label: 'Stop 2: Galle' },
  { sequence: 3, stationId: 'st-kandy', stationName: 'Kandy', platformId: null, label: 'Stop 3: Kandy' },
]

function renderForm(props: Partial<Parameters<typeof TerminationForm>[0]> = {}) {
  const onSubmit = vi.fn()
  const onDirtyChange = vi.fn()
  render(
    <TerminationForm stops={stops} isPending={false} onSubmit={onSubmit} onDirtyChange={onDirtyChange} {...props} />,
  )
  return { onSubmit, onDirtyChange }
}

describe('TerminationForm', () => {
  it('states what the termination does, in the hint under the field', () => {
    renderForm()

    const select = screen.getByLabelText('Last stop served')
    expect(select).toHaveAccessibleDescription('The train ends its journey after this stop. Later stops are no longer served.')
  })

  it('offers the stops it is given, labelled with their station names, after a placeholder', () => {
    renderForm()

    const options = screen.getAllByRole('option').map((option) => option.textContent)
    expect(options).toEqual(['Choose a stop', 'Stop 2: Galle', 'Stop 3: Kandy'])
  })

  it('shows no error before the user has touched the field', () => {
    renderForm()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Review termination' })).toBeDisabled()
  })

  it('shows the required error after the user leaves the field without choosing a stop', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByLabelText('Last stop served'))
    await user.tab()

    expect(screen.getByRole('alert')).toHaveTextContent('Choose the last stop the train served.')
    expect(screen.getByLabelText('Last stop served')).toHaveAttribute('aria-invalid', 'true')
  })

  it('enables the review button once a stop is chosen, and submits the chosen stop', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()

    await user.selectOptions(screen.getByLabelText('Last stop served'), 'Stop 2: Galle')
    expect(screen.getByRole('button', { name: 'Review termination' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Review termination' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith({ lastStopSequence: 2 })
  })

  it('reports dirty as soon as a stop is chosen, and clean again when the choice is cleared', async () => {
    const user = userEvent.setup()
    const { onDirtyChange } = renderForm()

    expect(onDirtyChange).toHaveBeenLastCalledWith(false)

    await user.selectOptions(screen.getByLabelText('Last stop served'), 'Stop 3: Kandy')
    expect(onDirtyChange).toHaveBeenLastCalledWith(true)

    await user.selectOptions(screen.getByLabelText('Last stop served'), 'Choose a stop')
    expect(onDirtyChange).toHaveBeenLastCalledWith(false)
  })

  it('copies the button text and disables it while a publish is pending', () => {
    renderForm({ isPending: true })

    expect(screen.getByRole('button', { name: 'Publishing…' })).toBeDisabled()
  })
})
