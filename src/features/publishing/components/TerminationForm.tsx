import { useEffect, useState, type FormEvent } from 'react'
import Button from '@/shared/components/Button'
import FormField from '@/shared/ui/FormField'
import type { StopOption } from '../lib/stopOptions'
import { validateTermination } from '../lib/validateChange'
import type { TerminationInput } from '../types'
import styles from './TerminationForm.module.css'

type TerminationFormProps = {
  // The page passes only the stops an early termination can end at, so the final calling stop is not here.
  stops: StopOption[]
  isPending: boolean
  onSubmit: (input: TerminationInput) => void
  onDirtyChange?: (isDirty: boolean) => void
}

// One field, so one touched flag. The error shows once the user has left the field or tried to submit.
// Submit is disabled until a stop is chosen, so a submit that reaches the handler is always valid.
export default function TerminationForm({ stops, isPending, onSubmit, onDirtyChange }: TerminationFormProps) {
  const [lastStopSequence, setLastStopSequence] = useState<number | null>(null)
  const [touched, setTouched] = useState(false)
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)

  const isDirty = lastStopSequence !== null
  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  const errors = validateTermination({ lastStopSequence })
  const isValid = errors.lastStopSequence === null
  const shownError = touched || attemptedSubmit ? errors.lastStopSequence : null

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAttemptedSubmit(true)

    if (lastStopSequence === null) {
      return
    }
    onSubmit({ lastStopSequence })
  }

  return (
    <form noValidate className={styles.form} onSubmit={handleSubmit}>
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

      <div className={styles.actions}>
        <Button type="submit" variant="danger" disabled={!isValid || isPending}>
          {isPending ? 'Publishing…' : 'Review termination'}
        </Button>
      </div>
    </form>
  )
}
