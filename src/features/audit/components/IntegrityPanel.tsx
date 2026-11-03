import Button from '@/shared/components/Button'
import { useIntegrityCheck } from '../hooks/useIntegrityCheck'
import styles from './IntegrityPanel.module.css'

// A deliberate action, not a page-load read: verifying the whole record is expensive enough that the
// auditor asks for it. A broken chain is an alert, not a badge, because it is a failure of the record.
export default function IntegrityPanel() {
  const integrity = useIntegrityCheck()

  return (
    <section className={styles.panel} aria-labelledby="audit-integrity-title">
      <div className={styles.header}>
        <div>
          <h2 id="audit-integrity-title" className={styles.title}>
            Chain integrity
          </h2>
          <p className={styles.hint}>Check that the recorded entries still form an unbroken hash chain.</p>
        </div>

        <Button onClick={() => integrity.mutate()} disabled={integrity.isPending}>
          {integrity.isPending ? 'Checking…' : 'Check integrity'}
        </Button>
      </div>

      {integrity.data?.status === 'intact' && (
        <p role="status" className={styles.intact}>
          {/* Colour and text together, like every other status on the board. */}
          <span className={styles.intactChip}>Chain intact</span>
          <span>, {integrity.data.entriesChecked} entries checked</span>
        </p>
      )}

      {integrity.data?.status === 'broken' && (
        <p role="alert" className={styles.broken}>
          Chain broken at position {integrity.data.firstFailingPosition} ({integrity.data.entriesChecked}{' '}
          entries checked)
        </p>
      )}

      {integrity.isError && (
        <div role="alert" className={styles.error}>
          <p className={styles.errorMessage}>
            {integrity.error instanceof Error
              ? integrity.error.message
              : 'The integrity check could not run. Please try again.'}
          </p>
          <Button variant="secondary" onClick={() => integrity.mutate()}>
            Try again
          </Button>
        </div>
      )}
    </section>
  )
}
