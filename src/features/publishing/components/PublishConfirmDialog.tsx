import type { ReactNode } from 'react'
import ConfirmDialog from '@/shared/ui/ConfirmDialog'
import { PROVENANCE_LABEL } from '../types'
import styles from './PublishConfirmDialog.module.css'

type PublishConfirmDialogProps = {
  isOpen: boolean
  title: string
  summary: ReactNode
  publishedBy: string
  confirmLabel: string
  confirmVariant?: 'primary' | 'danger'
  isConfirming: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}

// The provenance block is the statement the controller must read before a change goes out to every channel
// (M-16). It is not optional, so it lives here and not in each page.
export default function PublishConfirmDialog({
  isOpen,
  title,
  summary,
  publishedBy,
  confirmLabel,
  confirmVariant = 'primary',
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
          <p className={styles.provenance}>
            {`Published immediately to every channel. Published by ${publishedBy}, labelled "${PROVENANCE_LABEL}". Cannot be undone; a mistake is fixed with a correction.`}
          </p>
        </>
      }
      confirmLabel={confirmLabel}
      confirmVariant={confirmVariant}
      isConfirming={isConfirming}
      pendingLabel="Publishing…"
      error={error}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}
