import { useEffect, useState, type FormEvent } from 'react'
import FormField from '@/shared/ui/FormField'
import type { StopOption } from '../lib/stopOptions'
import { validateTermination } from '../lib/validateChange'
import type { TerminationInput } from '../types'
import styles from './TerminationForm.module.css'

type TerminationFormProps = {
  formId: string
  // The drawer passes only the stops an early termination can end at, so the final calling stop and every
  // stop the train has already left are not here.
  stops: StopOption[]
  onSubmit: (input: TerminationInput) => void
  onDirtyChange?: (isDirty: boolean) => void
  onValidityChange?: (isValid: boolean) => void
  // The drawer lists the stops that will not be served, so it needs the choice before the review step.
  onDraftChange?: (lastStopSequence: number | null) => void
}

// One field, so one touched flag. The error shows once the user has left the field or tried to submit.
// The review button stays disabled until a stop is chosen, so a submit that reaches the handler is always valid.
export default function TerminationForm({
  formId,
  stops,
  onSubmit,
  onDirtyChange,
  onValidityChange,
  onDraftChange,
}: TerminationFormProps) {
  const [lastStopSequence, setLastStopSequence] = useState<number | null>(null)
  const [touched, setTouched] = useState(false)
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)

  const isDirty = lastStopSequence !== null
  const errors = validateTermination({ lastStopSequence })
  const isValid = errors.lastStopSequence === null
  const shownError = touched || attemptedSubmit ? errors.lastStopSequence : null

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  useEffect(() => {
    onValidityChange?.(isValid)
  }, [isValid, onValidityChange])

  useEffect(() => {
    onDraftChange?.(lastStopSequence)
  }, [lastStopSequence, onDraftChange])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAttemptedSubmit(true)

    if (lastStopSequence === null) {
      return
    }
    onSubmit({ lastStopSequence })
  }

  return (
    <form id={formId} noValidate className={styles.form} onSubmit={handleSubmit}>
      <FormField
        id="termination-last-stop"
        label="Last stop served"
        hint="The train ends its journey after this stop. Later stops are no longer served."
        error={shownError}
      >
        {(a11y) => (
          <select
            {...a11y}
            className={styles.control}
            value={lastStopSequence === null ? '' : String(lastStopSequence)}
            onChange={(event) => setLastStopSequence(event.target.value === '' ? null : Number(event.target.value))}
            onBlur={() => setTouched(true)}
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
    </form>
  )
}
