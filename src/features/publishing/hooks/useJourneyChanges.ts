import { useQuery } from '@tanstack/react-query'
import { getJourneyChanges } from '../api/journeyChanges'

// Under ['journeys'], so the publish hooks' prefix invalidation refreshes it after a change is published.
export function useJourneyChanges(journeyId: string) {
  return useQuery({
    queryKey: ['journeys', 'changes', journeyId],
    queryFn: () => getJourneyChanges(journeyId),
  })
}
