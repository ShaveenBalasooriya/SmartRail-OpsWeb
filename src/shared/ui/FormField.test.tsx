import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import FormField from './FormField'

describe('FormField', () => {
  it('associates the visible label with the control', () => {
    render(
      <FormField id="delay-minutes" label="Delay in minutes">
        {(a11y) => <input {...a11y} type="number" />}
      </FormField>,
    )

    expect(screen.getByLabelText('Delay in minutes')).toHaveAttribute('id', 'delay-minutes')
  })

  it('describes the control by its hint', () => {
    render(
      <FormField id="delay-minutes" label="Delay in minutes" hint="Whole minutes, 1 to 720.">
        {(a11y) => <input {...a11y} type="number" />}
      </FormField>,
    )

    expect(screen.getByLabelText('Delay in minutes')).toHaveAccessibleDescription('Whole minutes, 1 to 720.')
    expect(screen.getByLabelText('Delay in minutes')).toHaveAttribute('aria-invalid', 'false')
  })

  it('shows the error as an alert and describes the control by it', () => {
    render(
      <FormField
        id="delay-minutes"
        label="Delay in minutes"
        hint="Whole minutes, 1 to 720."
        error="Enter a number from 1 to 720."
      >
        {(a11y) => <input {...a11y} type="number" />}
      </FormField>,
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Enter a number from 1 to 720.')

    const input = screen.getByLabelText('Delay in minutes')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Whole minutes, 1 to 720. Enter a number from 1 to 720.')
  })

  it('shows no alert and no description when there is neither a hint nor an error', () => {
    render(
      <FormField id="station" label="Station">
        {(a11y) => (
          <select {...a11y}>
            <option>Kandy</option>
          </select>
        )}
      </FormField>,
    )

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Station')).not.toHaveAttribute('aria-describedby')
  })
})
