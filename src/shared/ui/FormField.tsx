import type { ReactNode } from 'react'
import styles from './FormField.module.css'

export type FormFieldA11y = {
  id: string
  'aria-describedby': string | undefined
  'aria-invalid': boolean
}

type FormFieldProps = {
  id: string
  label: string
  hint?: string
  error?: string | null
  // A render prop, because only the caller knows the control. The caller spreads the a11y props onto it,
  // so the hint and error ids are wired without the field knowing the element type.
  children: (a11y: FormFieldA11y) => ReactNode
}

// The label is always a real <label>, never a placeholder (WCAG 3.3.2). The error is text with
// role="alert", so it is announced when it appears, and it is not colour alone.
export default function FormField({ id, label, hint, error, children }: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': Boolean(error) })}
      {error && (
        <p id={errorId} role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  )
}
