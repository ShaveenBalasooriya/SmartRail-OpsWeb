import styles from './LoadingIndicator.module.css'

type LoadingIndicatorProps = {
  label?: string
}

// The loading text is visible and announced; the spinner alone would not be enough (blueprint §11).
export default function LoadingIndicator({ label = 'Loading…' }: LoadingIndicatorProps) {
  return (
    <div className={styles.loading} role="status">
      <span className={styles.spinner} aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
