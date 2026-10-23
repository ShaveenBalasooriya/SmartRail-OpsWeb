import { useQuery } from '@tanstack/react-query'
import { getJourneyChanges } from '@/features/publishing/api/journeyChanges'
import { isMocked } from '@/shared/api/mockSwitch'
import { getJourneys } from '../api/journeys'
import { appliedStatus } from '../lib/applyChanges'
import type { Journey } from '../types'

// The date is part of the key so each railway day caches separately.
export function useJourneys(serviceDate: string) {
  return useQuery({
    queryKey: ['journeys', { serviceDate }],
    queryFn: () => listJourneys(serviceDate),
  })
}

// While the operations group is mocked, a cancelled or terminated journey shows that status on the board, from
// the changes published in this session. The board rows carry no stops, so only the status rule applies here.
// The real path returns the timetable unchanged, because the real API already reports the status.
async function listJourneys(serviceDate: string): Promise<Journey[]> {
  const journeys = await getJourneys(serviceDate)
  if (!isMocked('operations')) {
    return journeys
  }

  return Promise.all(
    journeys.map(async (journey) => ({
      ...journey,
      status: appliedStatus(journey.status, await getJourneyChanges(journey.id)),
    })),
  )
}
