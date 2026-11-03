import type { JourneyStatus } from '@/features/journeys/types'
import { formatRailwayTime } from '@/shared/lib/railwayTime'
import { CHANGE_TYPE_LABELS, PROVENANCE_LABEL, type ChangeType, type PublishedChange } from '../types'

// One end of the original/corrected link a history entry can carry. The label is the type and the railway
// publish time, so the link names the entry it points at.
export type ChangeLink = {
  id: string
  label: string
}

// What the history shows for one change. The publish time stays an instant here; the component formats it.
export type ChangeView = {
  id: string
  type: ChangeType
  typeLabel: string
  summary: string
  publisher: string
  publishedAt: string
  provenanceLabel: string
  isCorrected: boolean
  // The change a correction reverts, from values.correctsChangeId, so the history can link to it.
  correctsChangeId: string | null
  // The entry this correction reverts, when it is in the same history.
  original: ChangeLink | null
  // The correction that reverts this entry, when one exists and the API marked this entry corrected.
  correctedBy: ChangeLink | null
  // Whether a controller may withdraw this change now. Decided from the journey's status, so the action
  // is not offered where the API would refuse it.
  isCorrectable: boolean
}

// Pure, so the wording and the ordering are tested without React. The newest change comes first. The
// input is copied before sorting, so the query cache's array is never reordered in place.
//
// The values name stations and platforms only by id; the caller supplies the platform numbers that the
// journey's own stops carry, so no second reference-data request is needed. A correction's wording needs
// the publish time of the change it reverts, so the links are resolved once all views exist.
export function toChangeViews(
  changes: readonly PublishedChange[],
  platformNumbers: ReadonlyMap<string, string>,
  journeyStatus: JourneyStatus,
): ChangeView[] {
  const views = [...changes]
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .map((change): ChangeView => ({
      id: change.id,
      type: change.type,
      typeLabel: CHANGE_TYPE_LABELS[change.type],
      summary: summarise(change, platformNumbers),
      publisher: change.publisherName ?? 'Unknown publisher',
      publishedAt: change.publishedAt,
      provenanceLabel: provenanceLabel(change.provenance),
      isCorrected: change.corrected,
      correctsChangeId: correctsChangeIdOf(change),
      original: null,
      correctedBy: null,
      isCorrectable: isCorrectable(change, journeyStatus),
    }))

  const byId = new Map(views.map((view) => [view.id, view]))
  const corrections = new Map<string, ChangeView>()

  for (const view of views) {
    if (view.type !== 'correction' || view.correctsChangeId === null) {
      continue
    }

    const target = byId.get(view.correctsChangeId)
    if (target === undefined) {
      continue
    }

    const targetTime = formatRailwayTime(target.publishedAt)
    view.summary = `Reverts the change published at ${targetTime}`
    view.original = { id: target.id, label: `${target.typeLabel} at ${targetTime}` }
    corrections.set(target.id, view)
  }

  // The API marks the reverted change with corrected; the correction that names it is the link back.
  for (const view of views) {
    const correction = corrections.get(view.id)
    if (correction !== undefined && view.isCorrected) {
      view.correctedBy = {
        id: correction.id,
        label: `${correction.typeLabel} at ${formatRailwayTime(correction.publishedAt)}`,
      }
    }
  }

  return views
}

// The server accepts a correction on a scheduled, running, cancelled or terminated journey (see
// PublishCorrectionCommand's AcceptedStatuses and the endpoint's description in /openapi/v1.json,
// checked 2026-10-28). Only a completed journey is closed, so only that status hides the action. A
// correction itself cannot be corrected, and a change that already has one cannot get a second.
function isCorrectable(change: PublishedChange, journeyStatus: JourneyStatus): boolean {
  return journeyStatus !== 'completed' && change.type !== 'correction' && !change.corrected
}

function summarise(change: PublishedChange, platformNumbers: ReadonlyMap<string, string>): string {
  switch (change.type) {
    case 'delay':
      return `Delay of ${valueOf(change, 'minutes')} minutes from stop ${valueOf(change, 'fromStopSequence')}`
    case 'cancellation':
      return 'Cancelled'
    case 'termination':
      return `Ends at stop ${valueOf(change, 'lastStopSequence')}`
    case 'platform_change': {
      const platform = platformNumbers.get(valueOf(change, 'platformId')) ?? 'unknown'
      return `Stop ${valueOf(change, 'stopSequence')} moves to platform ${platform}`
    }
    case 'correction':
      // Replaced with the reverted entry's publish time once the views have been cross-referenced.
      return 'Reverts an earlier change'
  }
}

function correctsChangeIdOf(change: PublishedChange): string | null {
  const value = change.values.correctsChangeId
  return value === undefined || value === '' ? null : value
}

// The one provenance the API publishes today keeps its spec wording; an unknown value is shown as sent
// rather than relabelled as something it is not. The design's "Human-authored" is deliberately not
// invented: the owner has not decided that label.
function provenanceLabel(provenance: PublishedChange['provenance']): string {
  return provenance === 'automatically_published' ? PROVENANCE_LABEL : provenance
}

// A value the server did not send is shown as a dash, not as "undefined".
function valueOf(change: PublishedChange, key: string): string {
  const value = change.values[key]
  return value === undefined ? '—' : value
}
