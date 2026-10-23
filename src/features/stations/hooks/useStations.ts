import { useQuery } from '@tanstack/react-query'
import { getStations } from '../api/stations'

// Station names and platforms change rarely, so they are cached far longer than the board's 30 seconds.
export const STATION_STALE_TIME_MS = 10 * 60_000

export function useStations() {
  return useQuery({
    queryKey: ['stations'],
    queryFn: getStations,
    staleTime: STATION_STALE_TIME_MS,
  })
}
