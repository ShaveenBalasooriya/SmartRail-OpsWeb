import styles from './DelayPill.module.css'

type DelayPillProps = {
  // Whole minutes late (positive) or early (negative). Zero is on time; null is nothing reported.
  delayMinutes: number | null
}

// The label is words, not colour alone (WCAG 1.4.1), and it reuses the design tokens: late shares the
// platform-change amber, early has its own blue, and on time stays neutral.
function delayLabel(delayMinutes: number | null): string {
  if (delayMinutes === null) {
    return '—'
  }

  if (delayMinutes === 0) {
    return 'On time'
  }

  const minutes = Math.abs(delayMinutes)
  return delayMinutes > 0 ? `${minutes} min late` : `${minutes} min early`
}

export default function DelayPill({ delayMinutes }: DelayPillProps) {
  const kind = delayMinutes === null || delayMinutes === 0 ? 'onTime' : delayMinutes > 0 ? 'late' : 'early'

  return <span className={`${styles.pill} ${styles[kind]}`}>{delayLabel(delayMinutes)}</span>
}
