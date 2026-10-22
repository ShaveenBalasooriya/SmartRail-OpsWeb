import { useMutation, useQueryClient } from '@tanstack/react-query'
import { publishDelay } from '../api/publish'
import type { DelayInput } from '../types'
import { invalidateAfterPublish } from './invalidateAfterPublish'

// Returns the raw mutation so the form and the page read isPending and error from one place.
export function usePublishDelay(journeyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: DelayInput) => publishDelay(journeyId, input),
    onSuccess: () => invalidateAfterPublish(queryClient, journeyId),
  })
}
