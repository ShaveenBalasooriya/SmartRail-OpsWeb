import type { QueryClient } from '@tanstack/react-query'

// The board and the detail share the ['journeys'] prefix, so one prefix refreshes both. The changes key
// is named too, so the history refreshes even if the prefix rule is ever narrowed.
export async function invalidateAfterPublish(queryClient: QueryClient, journeyId: string): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['journeys'] }),
    queryClient.invalidateQueries({ queryKey: ['journeys', 'changes', journeyId] }),
  ])
}
