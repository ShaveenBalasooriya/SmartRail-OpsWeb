import { useEffect, useState, type FormEvent } from 'react'
import FormField from '@/shared/ui/FormField'
import type { DelayInput, DelayLimits } from '../types'
import type { StopOption } from '../lib/stopOptions'
import { parseMinutes, validateDelay } from '../lib/validateChange'
import styles from './DelayForm.module.css'

export type DelayDraft = {
  fromSequence: number | null
  minutesText: string
}

type DelayFormProps = {
  // The drawer's footer button submits this form by id, so the actions sit in the design's sticky row.
  formId: string
  stops: StopOption[]
  // The API's delay bounds, already loaded by the page. The form never carries a range of its own.
  limits: DelayLimits
  onSubmit: (input: DelayInput) => void
  onDirtyChange?: (isDirty: boolean) => void
  onValidityChange?: (isValid: boolean) => void
  // The drawer shows a live downstream preview, so it needs the draft before the review step.
  onDraftChange?: (draft: DelayDraft) => void
}

type DelayField = 'fromSequence' | 'minutes'

// Errors are derived during render, and a field's error shows only after the user has left it (touched).
// The review button stays disabled until the form is valid; a submit that reaches the handler is always valid.
export default function DelayForm({
  formId,
  stops,
  limits,
  onSubmit,
  onDirtyChange,
  onValidityChange,
  onDraftChange,
}: DelayFormProps) {
  const [fromSequence, setFromSequence] = useState<number | null>(null)
  const [minutesText, setMinutesText] = useState('')
  const [touched, setTouched] = useState<Partial<Record<DelayField, boolean>>>({})
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)

  const isDirty = fromSequence !== null || minutesText !== ''
  const errors = validateDelay({ fromSequence, minutesText, limits })
  const isValid = errors.fromSequence === null && errors.minutes === null

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  useEffect(() => {
    onValidityChange?.(isValid)
  }, [isValid, onValidityChange])

  useEffect(() => {
    onDraftChange?.({ fromSequence, minutesText })
  }, [fromSequence, minutesText, onDraftChange])

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
    <form id={formId} noValidate className={styles.form} onSubmit={handleSubmit}>
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
        hint={`Whole minutes, ${limits.minMinutes} to ${limits.maxMinutes}.`}
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
    </form>
  )
}
