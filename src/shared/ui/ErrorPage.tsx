import { useId, type ReactNode } from 'react'
import styles from './ErrorPage.module.css'

type ErrorPageProps = {
  title: string
  // A ReactNode lets the 403 page keep the design's two paragraphs without adding props for each one.
  message?: ReactNode
  // The design shows the HTTP status as a chip above the title on the full-page 403.
  code?: string
  actions?: ReactNode
  // A denied page is announced as an alert; a sign-in prompt is not.
  alert?: boolean
}

// A full-page shell for errors that replace the whole view (sign-in needed, forbidden, not found).
// Inline query errors use QueryState instead, so the rest of the page stays on screen.
export default function ErrorPage({ title, message, code, actions, alert = false }: ErrorPageProps) {
  const titleId = useId()

  return (
    <section className={styles.page}>
      <div className={styles.card} role={alert ? 'alert' : undefined} aria-labelledby={titleId}>
        {code && <span className={styles.code}>{code}</span>}
        <h1 id={titleId} className={styles.title}>
          {title}
        </h1>
        {message && (
          <div className={styles.message}>{typeof message === 'string' ? <p>{message}</p> : message}</div>
        )}
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </section>
  )
}
