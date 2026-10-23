import { useQuery } from '@tanstack/react-query'
import { getStation } from '../api/stations'
import { STATION_STALE_TIME_MS } from './useStations'

// enabled stays false for an empty id, so a route without a parameter never requests /stations/.
export function useStation(id: string) {
  return useQuery({
    queryKey: ['stations', id],
    queryFn: () => getStation(id),
    enabled: id !== '',
    staleTime: STATION_STALE_TIME_MS,
  })
}
