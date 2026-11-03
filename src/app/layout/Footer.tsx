import styles from './Footer.module.css'

// Railway times are shown in Sri Lanka time, so the footer says which clock the board uses.
export default function Footer() {
  return (
    <footer className={styles.footer}>
      <p>SmartRail Operations, MVP 1. All railway times are Sri Lanka time (Asia/Colombo).</p>
    </footer>
  )
}
