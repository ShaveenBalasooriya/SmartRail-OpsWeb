import { useMutation, useQueryClient } from '@tanstack/react-query'
import { publishPlatformChange } from '../api/publish'
import type { PlatformChangeInput } from '../types'
import { invalidateAfterPublish } from './invalidateAfterPublish'

export function usePublishPlatformChange(journeyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: PlatformChangeInput) => publishPlatformChange(journeyId, input),
    onSuccess: () => invalidateAfterPublish(queryClient, journeyId),
  })
}
