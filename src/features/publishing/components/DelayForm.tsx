import { useEffect, useState, type FormEvent } from 'react'
import Button from '@/shared/components/Button'
import FormField from '@/shared/ui/FormField'
import { DELAY_MAX_MINUTES, DELAY_MIN_MINUTES, type DelayInput } from '../types'
import type { StopOption } from '../lib/stopOptions'
import { parseMinutes, validateDelay } from '../lib/validateChange'
import styles from './DelayForm.module.css'

type DelayFormProps = {
  stops: StopOption[]
  isPending: boolean
  onSubmit: (input: DelayInput) => void
  onDirtyChange?: (isDirty: boolean) => void
}

type DelayField = 'fromSequence' | 'minutes'

// Errors are derived during render, and a field's error shows only after the user has left it (touched).
// Submit is disabled until the form is valid, so a submit that reaches the handler is always valid.
export default function DelayForm({ stops, isPending, onSubmit, onDirtyChange }: DelayFormProps) {
  const [fromSequence, setFromSequence] = useState<number | null>(null)
  const [minutesText, setMinutesText] = useState('')
  const [touched, setTouched] = useState<Partial<Record<DelayField, boolean>>>({})
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)

  const isDirty = fromSequence !== null || minutesText !== ''
  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  const errors = validateDelay({ fromSequence, minutesText })
  const isValid = errors.fromSequence === null && errors.minutes === null

  function shownError(field: DelayField): string | null {
    return touched[field] || attemptedSubmit ? errors[field] : null
  }

  function touch(field: DelayField) {
    setTouched((current) => ({ ...current, [field]: true }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAttemptedSubmit(true)

    const minutes = parseMinutes(minutesText)
    if (fromSequence === null || minutes === null || !isValid) {
      return
    }
    onSubmit({ fromSequence, minutes })
  }

  return (
    <form noValidate className={styles.form} onSubmit={handleSubmit}>
      <FormField id="delay-from-stop" label="Delay starts at stop" error={shownError('fromSequence')}>
        {(a11y) => (
          <select
            {...a11y}
            className={styles.control}
            value={fromSequence === null ? '' : String(fromSequence)}
            onChange={(event) => setFromSequence(event.target.value === '' ? null : Number(event.target.value))}
            onBlur={() => touch('fromSequence')}
          >
            <option value="">Choose a stop</option>
            {stops.map((stop) => (
              <option key={stop.sequence} value={stop.sequence}>
                {stop.label}
              </option>
            ))}
          </select>
        )}
      </FormField>

      <FormField
        id="delay-minutes"
        label="Delay in minutes"
        hint={`Whole minutes, ${DELAY_MIN_MINUTES} to ${DELAY_MAX_MINUTES}.`}
        error={shownError('minutes')}
      >
        {(a11y) => (
          <input
            {...a11y}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className={styles.control}
            value={minutesText}
            onChange={(event) => setMinutesText(event.target.value)}
            onBlur={() => touch('minutes')}
          />
        )}
      </FormField>

      <div className={styles.actions}>
        <Button type="submit" disabled={!isValid || isPending}>
          {isPending ? 'Publishing…' : 'Review delay'}
        </Button>
      </div>
    </form>
  )
}
