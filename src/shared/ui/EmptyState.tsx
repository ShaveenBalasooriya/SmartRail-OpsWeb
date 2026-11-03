import type { ReactNode } from 'react'
import styles from './EmptyState.module.css'

type EmptyStateProps = {
  title: string
  description?: string
  action?: ReactNode
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <section className={styles.empty}>
      <h2 className={styles.title}>{title}</h2>
      {description && <p className={styles.description}>{description}</p>}
      {action}
    </section>
  )
}
