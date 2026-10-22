import { useMutation, useQueryClient } from '@tanstack/react-query'
import { publishCancellation } from '../api/publish'
import { invalidateAfterPublish } from './invalidateAfterPublish'

export function usePublishCancellation(journeyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => publishCancellation(journeyId),
    onSuccess: () => invalidateAfterPublish(queryClient, journeyId),
  })
}
