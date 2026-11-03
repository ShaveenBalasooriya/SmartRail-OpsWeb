import { useQuery } from '@tanstack/react-query'
import { getPublishingRules } from '../api/publishingRules'

// The railway's publishing rules change far more rarely than a journey, so they are cached for as long
// as the station catalogue. A retry still refetches, because a refetch ignores staleTime.
export const PUBLISHING_RULES_STALE_TIME_MS = 10 * 60_000

export function usePublishingRules() {
  return useQuery({
    queryKey: ['publishing-rules'],
    queryFn: getPublishingRules,
    staleTime: PUBLISHING_RULES_STALE_TIME_MS,
  })
}
