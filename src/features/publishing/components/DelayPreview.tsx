import { formatRailwayTime } from '@/shared/lib/railwayTime'
import type { DelayPreviewRow } from '../lib/delayPreview'
import styles from './PublishDrawer.module.css'

type DelayPreviewProps = {
  rows: DelayPreviewRow[]
  hasSelection: boolean
}

function TimeCell({ value }: { value: string | null }) {
  if (value === null) {
    return <>—</>
  }

  return <time dateTime={value}>{formatRailwayTime(value)}</time>
}

// The design's downstream table. New expected is the current expectation plus the delay; it is an estimate,
// because the server computes the published times. The caption says so in words, so the preview is never read
// as authoritative.
export default function DelayPreview({ rows, hasSelection }: DelayPreviewProps) {
  return (
    <section className={styles.section} aria-labelledby="delay-preview-title">
      <h3 id="delay-preview-title" className={styles.sectionTitle}>
        Downstream expected times
      </h3>

      {!hasSelection || rows.length === 0 ? (
        <p className={styles.hint}>Choose a stop and a delay in minutes to see the estimate.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className={styles.caption}>Estimate; the server calculates the published times.</caption>
            <thead>
              <tr>
                <th scope="col">Stop</th>
                <th scope="col">Scheduled</th>
                <th scope="col">Now expected</th>
                <th scope="col">New expected</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.sequence}>
                  <td>{row.stopLabel}</td>
                  <td>
                    <TimeCell value={row.scheduled} />
                  </td>
                  <td>
                    <TimeCell value={row.nowExpected} />
                  </td>
                  <td>
                    <span className={styles.newTime}>
                      <TimeCell value={row.newExpected} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
