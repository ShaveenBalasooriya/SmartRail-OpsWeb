import { Link } from 'react-router'
import styles from './PublishPageHeader.module.css'

type PublishPageHeaderProps = {
  titleId: string
  title: string
  serviceName: string | null
  journeyId: string
  serviceDate: string
  // A development mock is not sent to any API, so the page says so. The page reads the flag and passes it in.
  isMocked: boolean
}

export default function PublishPageHeader({
  titleId,
  title,
  serviceName,
  journeyId,
  serviceDate,
  isMocked,
}: PublishPageHeaderProps) {
  return (
    <>
      <Link
        to={`/journeys/${encodeURIComponent(journeyId)}?date=${encodeURIComponent(serviceDate)}`}
        className={styles.back}
      >
        Back to the journey
      </Link>

      <header className={styles.header}>
        <h1 id={titleId} className={styles.title}>
          {title}
        </h1>
        {serviceName !== null && <p className={styles.service}>{serviceName}</p>}
      </header>

      {isMocked && <p className={styles.mock}>Development mock: this change is not sent to the API yet.</p>}
    </>
  )
}
