import styles from './ReviewList.module.css'

type ReviewListProps = {
  title: string
  items: readonly string[]
}

// A titled list inside a review dialog: the design's "This reaches:" audience block, and the termination's
// "No longer served:" stops. Each item is text, so nothing here depends on colour.
export default function ReviewList({ title, items }: ReviewListProps) {
  return (
    <div className={styles.block}>
      <p className={styles.title}>{title}</p>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
