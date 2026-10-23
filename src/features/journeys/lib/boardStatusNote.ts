import type { Journey } from '../types'

// The board says what is known about status. With no status reported at all, the status filters match nothing.
// When only some journeys report one, the note says which do, so it never claims that no status exists.
// null means every journey reports its status, so there is nothing to say.
export function boardStatusNote(journeys: readonly Journey[]): string | null {
  const reported = journeys.filter((journey) => journey.status !== null).length

  if (reported === journeys.length) {
    return null
  }
  if (reported === 0) {
    return 'Live status is not available yet, so status filters match nothing. Scheduled times are shown.'
  }
  return 'Only journeys with a published change show a status. The others show Not reported.'
}
