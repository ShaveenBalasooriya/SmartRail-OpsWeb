import { REACH_AUDIENCES } from '../lib/audiences'
import styles from './ReachList.module.css'

type ReachListProps = {
  // The design's wording differs per flow: "This delay reaches", "This cancellation reaches", and so on.
  title: string
}

export function ReachItems() {
  return (
    <ul className={styles.list}>
      {REACH_AUDIENCES.map((audience) => (
        <li key={audience}>{audience}</li>
      ))}
    </ul>
  )
}

// The drawer's own section, with a real heading. The review dialog uses ReachItems under its own sentence.
export default function ReachList({ title }: ReachListProps) {
  return (
    <section className={styles.section} aria-label={title}>
      <h3 className={styles.title}>{title}</h3>
      <ReachItems />
    </section>
  )
}
