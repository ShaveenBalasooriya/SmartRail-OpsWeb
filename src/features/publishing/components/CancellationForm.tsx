import type { FormEvent } from 'react'
import Button from '@/shared/components/Button'
import styles from './CancellationForm.module.css'

type CancellationFormProps = {
  journeyName: string
  isPending: boolean
  onSubmit: () => void
}

// There are no fields. The form only asks for the decision, and the confirm dialog is the gate that stops
// an accidental cancellation.
export default function CancellationForm({ journeyName, isPending, onSubmit }: CancellationFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <p className={styles.message}>
        Cancelling {journeyName} takes effect on every channel at once. A journey can only be cancelled before it
        departs.
      </p>

      <div className={styles.actions}>
        <Button type="submit" variant="danger" disabled={isPending}>
          {isPending ? 'Publishing…' : 'Review cancellation'}
        </Button>
      </div>
    </form>
  )
}
