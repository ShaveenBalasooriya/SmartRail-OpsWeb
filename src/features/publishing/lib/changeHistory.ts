import { platformNumber, type StationIndex } from '@/features/stations/lib/stationLookup'
import { CHANGE_TYPE_LABELS, PROVENANCE_LABEL, type PublishedChange } from '../types'

// What the history shows for one change. The publish time stays an instant here; the component formats it.
export type ChangeView = {
  id: string
  typeLabel: string
  summary: string
  publisher: string
  publishedAt: string
  provenanceLabel: string
  isCorrected: boolean
}

// Pure, so the wording and the ordering are tested without React. The newest change comes first. The input is
// copied before sorting, so the query cache's array is never reordered in place.
export function toChangeViews(changes: readonly PublishedChange[], stationIndex: StationIndex): ChangeView[] {
  return [...changes]
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .map((change) => ({
      id: change.id,
      typeLabel: CHANGE_TYPE_LABELS[change.type],
      summary: summarise(change, stationIndex),
      publisher: change.publishedBy,
      publishedAt: change.publishedAt,
      provenanceLabel: PROVENANCE_LABEL,
      isCorrected: change.correctedByChangeId !== null,
    }))
}

function summarise(change: PublishedChange, stationIndex: StationIndex): string {
  switch (change.type) {
    case 'delay':
      return `Delay of ${valueOf(change, 'minutes')} minutes from stop ${valueOf(change, 'fromSequence')}`
    case 'cancellation':
      return 'Journey cancelled'
    case 'termination':
      return `Last stop served: stop ${valueOf(change, 'lastStopSequence')}`
    case 'platform_change': {
      const platform = platformNumber(stationIndex, valueOf(change, 'platformId')) ?? 'unknown'
      return `Stop ${valueOf(change, 'sequence')} moves to platform ${platform}`
    }
    case 'correction':
      return change.correctsChangeId === null ? 'Correction' : 'Reverts an earlier change'
  }
}

// A value the server did not send is shown as a dash, not as "undefined".
function valueOf(change: PublishedChange, key: string): string {
  const value = change.values[key]
  return value === undefined ? '—' : String(value)
}
