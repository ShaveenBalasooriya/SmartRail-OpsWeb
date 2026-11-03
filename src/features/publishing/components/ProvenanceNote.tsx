import styles from './ProvenanceNote.module.css'

type ProvenanceNoteProps = {
  publisherName: string
}

// The pre-publish statement. It names the person and the fact that a mistake is corrected, not reversed. The
// API's "Automatically published" label is deliberately absent here: that label belongs where a server value
// is displayed, so the confirmation page and the change history use it, and this note does not invent one.
export default function ProvenanceNote({ publisherName }: ProvenanceNoteProps) {
  return (
    <p className={styles.note}>
      {`Published immediately by ${publisherName}. A mistake is fixed with a correction.`}
    </p>
  )
}
