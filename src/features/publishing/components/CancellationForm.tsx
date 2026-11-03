import { formatRailwayTime } from '@/shared/lib/railwayTime'
import styles from './CancellationForm.module.css'

type CancellationFormProps = {
  serviceName: string
  // The first calling stop's scheduled departure, shown in railway time. null when the feed has no time.
  scheduledDeparture: string | null
}

// There are no fields. The panel states what a cancellation does, and the review dialog is the gate that stops
// an accidental cancellation. The warning is text as well as colour, as everywhere else.
export default function CancellationForm({ serviceName, scheduledDeparture }: CancellationFormProps) {
  const departure =
    scheduledDeparture === null ? null : formatRailwayTime(scheduledDeparture)

  return (
    <>
      <section className={styles.section} aria-labelledby="cancel-title">
        <h3 id="cancel-title" className={styles.title}>
          {`Cancel ${serviceName}?`}
        </h3>
        <p className={styles.message}>
          {departure === null
            ? `${serviceName} has not left yet. The cancellation takes effect on every channel at once. A journey that has departed cannot be cancelled.`
            : `${serviceName} departs ${departure} and has not left yet. The cancellation takes effect on every channel at once. A journey that has departed cannot be cancelled.`}
        </p>
      </section>

      <div className={styles.warning}>
        <strong>This cannot be undone.</strong>
        <span>A mistake is fixed with a correction, not by reversing the cancellation.</span>
      </div>
    </>
  )
}
