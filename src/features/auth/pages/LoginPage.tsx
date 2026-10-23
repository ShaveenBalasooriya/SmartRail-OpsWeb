import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { useAuth } from '@/app/providers/AuthContext'
import type { Role } from '../types'
import LoginForm from '../components/LoginForm'
import styles from './LoginPage.module.css'

// The mutation lives here, not in a hook, as the blueprint does for single-use page queries.
export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [role, setRole] = useState<Role>('network_controller')
  const loginMutation = useMutation({ mutationFn: (selected: Role) => login(selected) })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    loginMutation.mutate(role, {
      onSuccess: () => navigate('/board', { replace: true }),
    })
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.note}>
          Development sign-in: choose a role. This stands in for Authentik sign-in until the identity change lands.
        </p>
        <LoginForm
          role={role}
          isPending={loginMutation.isPending}
          error={loginMutation.error}
          onRoleChange={setRole}
          onSubmit={handleSubmit}
        />
      </div>
    </main>
  )
}
