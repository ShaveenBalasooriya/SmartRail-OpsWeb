import type { ReactNode } from 'react'
import styles from './ErrorPage.module.css'

type ErrorPageProps = {
  title: string
  message?: string
  actions?: ReactNode
}

// A full-page shell for errors that replace the whole view (sign-in needed, forbidden, not found).
// Inline query errors use QueryState instead, so the rest of the page stays on screen.
export default function ErrorPage({ title, message, actions }: ErrorPageProps) {
  return (
    <section className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>{title}</h1>
        {message && <p className={styles.message}>{message}</p>}
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </section>
  )
}
