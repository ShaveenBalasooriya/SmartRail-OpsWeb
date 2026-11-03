import type { ReactNode } from 'react'
import ConfirmDialog from '@/shared/ui/ConfirmDialog'
import styles from './PublishConfirmDialog.module.css'

type PublishConfirmDialogProps = {
  isOpen: boolean
  title: string
  summary: ReactNode
  publishedBy: string
  confirmLabel: string
  cancelLabel?: string
  confirmVariant?: 'primary' | 'danger'
  // The design's "This reaches:" block, and the early termination's "No longer served:" list. It sits between
  // the summary and the provenance sentence, as in the design.
  extra?: ReactNode
  isConfirming: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}

// The provenance statement is what the controller must read before a change goes out to every channel. It is
// not optional, so it lives here and not in each drawer. It names the person and the fact that a mistake is
// corrected; the API's provenance label is shown only where the API's own value is displayed.
export default function PublishConfirmDialog({
  isOpen,
  title,
  summary,
  publishedBy,
  confirmLabel,
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  extra,
  isConfirming,
  error,
  onConfirm,
  onCancel,
}: PublishConfirmDialogProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      title={title}
      message={
        <>
          <p className={styles.summary}>{summary}</p>
          {extra}
          <p className={styles.provenance}>
            {`Published immediately to every channel by ${publishedBy}. It cannot be undone; a mistake is fixed with a correction.`}
          </p>
        </>
      }
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      confirmVariant={confirmVariant}
      isConfirming={isConfirming}
      pendingLabel="Publishing…"
      error={error}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}
