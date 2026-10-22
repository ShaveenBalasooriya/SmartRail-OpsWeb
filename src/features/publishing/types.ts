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

// The request bodies and this response shape are ASSUMED from the OpenSpec change
// add-controller-operations, which states the rules but not the field names. Confirm them against
// /openapi/v1.json when the endpoints ship.
export type PublishedChange = {
  id: string
  type: ChangeType
  journeyId: string
  values: Record<string, string | number>
  publishedBy: string
  publishedAt: string
  provenance: ChangeProvenance
  correctedByChangeId: string | null
  correctsChangeId: string | null
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
