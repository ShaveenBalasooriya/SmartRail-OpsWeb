import type { ReactNode } from 'react'
import styles from './Badge.module.css'

type BadgeKind = 'status' | 'platform'

type BadgeProps = {
  // kind and value select the colour tokens, e.g. --status-running-bg. Adding a value needs new
  // tokens in index.css and no new code here.
  kind: BadgeKind
  value: string
  size?: 'sm' | 'md'
  // Opt-in, so only the badges that should animate do.
  className?: string
  // The visible text label. A badge is never colour alone (WCAG 1.4.1), so children is required.
  children: ReactNode
}

export default function Badge({ kind, value, size = 'md', className, children }: BadgeProps) {
  return (
    <span
      className={`${styles.badge} ${styles[size]} ${className ?? ''}`}
      style={{
        backgroundColor: `var(--${kind}-${value}-bg)`,
        color: `var(--${kind}-${value}-text)`,
      }}
    >
      {children}
    </span>
  )
}
