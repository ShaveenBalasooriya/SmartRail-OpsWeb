import styles from './StationName.module.css'

type StationNameProps = {
  // null is an id the reference data does not know. It renders as a visible fallback, not as blank text.
  name: string | null
  isInterchange?: boolean
}

// The "Interchange" tag is words, not colour, so it is readable without colour vision (WCAG 1.4.1).
export default function StationName({ name, isInterchange = false }: StationNameProps) {
  return (
    <span className={styles.station}>
      {name === null ? <span className={styles.unknown}>Unknown station</span> : name}
      {isInterchange && <span className={styles.interchange}>Interchange</span>}
    </span>
  )
}
