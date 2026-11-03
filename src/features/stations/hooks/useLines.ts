import { useQuery } from '@tanstack/react-query'
import { getLines } from '../api/lines'
import { STATION_STALE_TIME_MS } from './useStations'

// The physical network changes rarely, so the lines are cached as long as the station list. The map's
// Refresh still refetches it, because a refetch ignores staleTime.
export function useLines() {
  return useQuery({
    queryKey: ['lines'],
    queryFn: getLines,
    staleTime: STATION_STALE_TIME_MS,
  })
}
