import { useQuery } from '@tanstack/react-query'
import { getJourney } from '../api/journeys'

// The detail read carries the journey, its stops and its change history in one response, so there is no
// second request for changes. The key sits under ['journeys'], so the board's prefix invalidation
// refreshes the detail too.
export function useJourney(journeyId: string) {
  return useQuery({
    queryKey: ['journeys', journeyId],
    queryFn: () => getJourney(journeyId),
  })
}
