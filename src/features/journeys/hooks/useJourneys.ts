import { useQuery } from '@tanstack/react-query'
import { getJourneys } from '../api/journeys'

// The board is today's board: the operations list has no date parameter, so the key has no date either.
// Everything under ['journeys'] is refreshed by one prefix invalidation after a publish.
export function useJourneys() {
  return useQuery({
    queryKey: ['journeys'],
    queryFn: getJourneys,
  })
}
