// Publishing is the controller's write side: delay, cancellation, early termination and platform change.
export type ChangeType = 'delay' | 'cancellation' | 'termination' | 'platform_change' | 'correction'

export const CHANGE_TYPE_VALUES: ChangeType[] = [
  'delay',
  'cancellation',
  'termination',
  'platform_change',
  'correction',
]

export const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  delay: 'Delay',
  cancellation: 'Cancellation',
  termination: 'Early termination',
  platform_change: 'Platform change',
  correction: 'Correction',
}

// The label the spec gives every published change, so a passenger and a controller read the same word.
export const PROVENANCE_LABEL = 'Automatically published'

export type ChangeProvenance = 'automatically_published'

// The change shape both operations endpoints return (ControllerChangeResponse in openapi/v1.json,
// checked 2026-10-28). It has no journey id, because a change belongs to the journey whose detail
// carries it, and no correctedByChangeId: a correction marks its target with `corrected` and names it
// in values.correctsChangeId.
export type PublishedChange = {
  id: string
  type: ChangeType
  // Every value is a string on the wire; nulls are dropped when the response is mapped.
  values: Record<string, string>
  publisherName: string | null
  publishedAt: string
  provenance: ChangeProvenance
  corrected: boolean
}

// The spec says whole minutes from 1 to 720. The API enforces the same range, so the form shows it first.
export const DELAY_MIN_MINUTES = 1
export const DELAY_MAX_MINUTES = 720

export type DelayInput = {
  fromSequence: number
  minutes: number
}

export type PlatformChangeInput = {
  sequence: number
  platformId: string
}

// The last calling stop the train served. The request body uses the same field name.
export type TerminationInput = {
  lastStopSequence: number
}
