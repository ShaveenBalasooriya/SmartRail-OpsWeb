import { useMutation, useQueryClient } from '@tanstack/react-query'
import { publishCorrection } from '../api/publish'

// The change id is the only input: the journey is the change's own, so the caller does not name it.
// The ['journeys'] prefix covers the board, the journey detail and the change history it carries, so one
// invalidation refreshes everything the corrected change touches.
export function usePublishCorrection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (changeId: string) => publishCorrection(changeId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['journeys'] })
    },
  })
}
