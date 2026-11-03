import { useMutation, useQueryClient } from '@tanstack/react-query'
import { publishTermination } from '../api/publish'
import type { TerminationInput } from '../types'
import { invalidateAfterPublish } from './invalidateAfterPublish'

export function usePublishTermination(journeyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: TerminationInput) => publishTermination(journeyId, input),
    onSuccess: () => invalidateAfterPublish(queryClient, journeyId),
  })
}
