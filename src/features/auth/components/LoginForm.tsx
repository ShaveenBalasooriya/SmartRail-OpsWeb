import type { FormEvent } from 'react'
import Button from '@/shared/components/Button'
import { ROLE_LABELS, ROLE_VALUES, type Role } from '../types'
import styles from './LoginForm.module.css'

type LoginFormProps = {
  role: Role
  isPending: boolean
  error: Error | null
  onRoleChange: (role: Role) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

// Server errors show a friendly sentence rather than raw text. The sign-in error is the one place
// that could carry a meaningful message, but the dev sign-in cannot fail in a useful way, so the
// generic line is used.
export default function LoginForm({ role, isPending, error, onRoleChange, onSubmit }: LoginFormProps) {
  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <fieldset className={styles.fieldset} disabled={isPending}>
        <legend className={styles.legend}>Role</legend>
        {ROLE_VALUES.map((value) => {
          const id = `role-${value}`
          return (
            <div key={value} className={styles.option}>
              <input
                id={id}
                type="radio"
                name="role"
                value={value}
                checked={role === value}
                onChange={() => onRoleChange(value)}
              />
              <label htmlFor={id}>{ROLE_LABELS[value]}</label>
            </div>
          )
        })}
      </fieldset>

      {error && (
        <p role="alert" className={styles.error}>
          Sign-in did not work. Please try again.
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}
