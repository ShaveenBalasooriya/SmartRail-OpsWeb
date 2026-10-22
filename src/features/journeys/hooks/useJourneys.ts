import { useQuery } from '@tanstack/react-query'
import { getJourneys } from '../api/journeys'

// The date is part of the key so each railway day caches separately.
export function useJourneys(serviceDate: string) {
  return useQuery({
    queryKey: ['journeys', { serviceDate }],
    queryFn: () => getJourneys(serviceDate),
  })
}
