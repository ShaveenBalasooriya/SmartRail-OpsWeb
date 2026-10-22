import { useQuery } from '@tanstack/react-query'
import { getJourney } from '../api/journeys'

// The key sits under ['journeys'], so invalidating the board's prefix refreshes the detail too. It is a
// separate fetch from the board's list for now. Later, a select over the cached list could share one
// request, once the coupling is worth it.
export function useJourney(journeyId: string, serviceDate: string) {
  return useQuery({
    queryKey: ['journeys', { serviceDate }, journeyId],
    queryFn: () => getJourney(journeyId, serviceDate),
  })
}
