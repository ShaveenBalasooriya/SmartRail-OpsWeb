import { lineColourStyle } from '@/shared/lib/lineColour'
import type { LineGeometry } from '../lib/layoutMap'
import styles from './MapLegend.module.css'

type MapLegendProps = {
  lines: readonly LineGeometry[]
}

// The legend is the key to the colours, and every status in it is also a word, so nothing on the map
// depends on colour alone.
export default function MapLegend({ lines }: MapLegendProps) {
  return (
    <ul className={styles.legend} aria-label="Legend">
      {lines.map((line) => (
        <li key={line.id}>
          <span
            className={styles.swatch}
            style={lineColourStyle(line.colour)}
            aria-hidden="true"
          />
          {line.name}
        </li>
      ))}
      <li>
        <span className={styles.running}>Running</span>
      </li>
      <li>
        <span className={styles.terminated}>Terminated</span>
      </li>
      <li>
        <span className={styles.stale}>Stale</span> dashed outline, no recent update
      </li>
    </ul>
  )
}
