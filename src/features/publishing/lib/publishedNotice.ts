import { formatRailwayTime } from '@/shared/lib/railwayTime'
import { CHANGE_TYPE_LABELS, CHANGE_TYPE_VALUES, type ChangeType } from '../types'

// Carried in router location state after a publish redirects to the journey. It is untrusted (any
// history entry can carry state), so it is checked before use.
export type PublishedNotice = {
  type: ChangeType
  publishedAt: string
}

export function publishedNoticeFrom(state: unknown): PublishedNotice | null {
  if (typeof state !== 'object' || state === null || !('published' in state)) {
    return null
  }

  const published = (state as { published: unknown }).published
  if (typeof published !== 'object' || published === null) {
    return null
  }

  const { type, publishedAt } = published as { type?: unknown; publishedAt?: unknown }
  if (typeof type !== 'string' || !(CHANGE_TYPE_VALUES as string[]).includes(type)) {
    return null
  }
  if (typeof publishedAt !== 'string' || Number.isNaN(Date.parse(publishedAt))) {
    return null
  }

  return { type: type as ChangeType, publishedAt }
}

// Railway time, as the rest of the app shows times. Example: "Delay published at 08:10".
export function publishedNoticeText(notice: PublishedNotice): string {
  return `${CHANGE_TYPE_LABELS[notice.type]} published at ${formatRailwayTime(notice.publishedAt)}`
}
