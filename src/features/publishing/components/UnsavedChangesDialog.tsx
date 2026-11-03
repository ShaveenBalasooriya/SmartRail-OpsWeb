import ConfirmDialog from '@/shared/ui/ConfirmDialog'

type UnsavedChangesDialogProps = {
  isOpen: boolean
  onStay: () => void
  onLeave: () => void
}

// Shown when the blocker stops a navigation away from a dirty form. The change was never published, so the
// wording says it is lost if the user leaves.
export default function UnsavedChangesDialog({ isOpen, onStay, onLeave }: UnsavedChangesDialogProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      title="Leave without publishing?"
      message="Your change has not been published, and leaving now discards it."
      confirmLabel="Leave"
      confirmVariant="danger"
      cancelLabel="Stay on this page"
      onConfirm={onLeave}
      onCancel={onStay}
    />
  )
}
