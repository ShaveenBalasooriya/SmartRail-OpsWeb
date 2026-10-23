import type { PublishedChange } from '../types'

// The in-memory stand-in for the change history while the operations group is mocked. Changes published
// through the mock are written here, and the journey views read them back, so a published change shows up
// on the journey. It lives only in this module: a page reload empties it. Tests reset it with resetMockChanges.
const changesByJourney = new Map<string, PublishedChange[]>()

export function recordChange(change: PublishedChange): void {
  const existing = changesByJourney.get(change.journeyId) ?? []
  changesByJourney.set(change.journeyId, [...existing, change])
}

// A copy, so a caller cannot change the store by editing the array it was given.
export function getChanges(journeyId: string): PublishedChange[] {
  return [...(changesByJourney.get(journeyId) ?? [])]
}

// Tests only.
export function resetMockChanges(): void {
  changesByJourney.clear()
}
