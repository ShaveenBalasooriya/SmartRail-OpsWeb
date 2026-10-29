import { useState, type FormEvent } from 'react'
import Button from '@/shared/components/Button'
import FormField from '@/shared/ui/FormField'
import { AUDIT_OUTCOME_LABELS, AUDIT_OUTCOME_VALUES, isAuditOutcomeFilter } from '../types'
import { auditFilterErrors, hasAuditFilterErrors, EMPTY_AUDIT_FILTER_INPUT } from '../lib/auditFilters'
import type { AuditFilterInput } from '../types'
import styles from './AuditFilterBar.module.css'

type AuditFilterBarProps = {
  // The applied filters, used as the starting point. The page remounts the bar when the URL changes.
  initialInput: AuditFilterInput
  onApply: (input: AuditFilterInput) => void
  onClear: () => void
}

// Renders inside the shared FilterBar layout. A real <form> gives Enter-to-apply and one place to
// validate, and every label is a real <label> bound to its control.
export default function AuditFilterBar({ initialInput, onApply, onClear }: AuditFilterBarProps) {
  const [input, setInput] = useState(initialInput)
  const errors = auditFilterErrors(input)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // An invalid value is shown by FormField and never sent; validation lives in one place for both the
    // form and the URL.
    if (hasAuditFilterErrors(errors)) {
      return
    }
    onApply(input)
  }

  function update(patch: Partial<AuditFilterInput>) {
    setInput((previous) => ({ ...previous, ...patch }))
  }

  // Clearing resets unsaved edits too. If the URL is already empty it does not change, so the remount
  // that normally resets the form would not happen.
  function handleClear() {
    setInput(EMPTY_AUDIT_FILTER_INPUT)
    onClear()
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <FormField
        id="audit-actor"
        label="Actor staff id"
        hint="A staff GUID. The record shows the role, not a name."
        error={errors.actorId}
      >
        {(a11y) => (
          <input
            {...a11y}
            type="text"
            className={styles.control}
            value={input.actorId}
            onChange={(event) => update({ actorId: event.target.value })}
          />
        )}
      </FormField>

      <FormField id="audit-from" label="From" error={errors.from}>
        {(a11y) => (
          <input
            {...a11y}
            type="datetime-local"
            className={styles.control}
            value={input.from}
            onChange={(event) => update({ from: event.target.value })}
          />
        )}
      </FormField>

      <FormField id="audit-to" label="To" error={errors.to ?? errors.range}>
        {(a11y) => (
          <input
            {...a11y}
            type="datetime-local"
            className={styles.control}
            value={input.to}
            onChange={(event) => update({ to: event.target.value })}
          />
        )}
      </FormField>

      <div className={styles.field}>
        <label htmlFor="audit-outcome">Outcome</label>
        <select
          id="audit-outcome"
          className={styles.control}
          value={input.outcome}
          onChange={(event) => {
            const next = event.target.value
            if (isAuditOutcomeFilter(next)) {
              update({ outcome: next })
            }
          }}
        >
          <option value="all">All outcomes</option>
          {AUDIT_OUTCOME_VALUES.map((value) => (
            <option key={value} value={value}>
              {AUDIT_OUTCOME_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.actions}>
        <Button type="submit">Apply filters</Button>
        <Button type="button" variant="secondary" onClick={handleClear}>
          Clear filters
        </Button>
      </div>
    </form>
  )
}
