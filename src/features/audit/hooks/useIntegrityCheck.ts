import { useMutation } from '@tanstack/react-query'
import { checkIntegrity } from '../api/audit'

// An action, not a cached read: each click asks the API to verify the chain again, and a result is never
// reused from the cache.
export function useIntegrityCheck() {
  return useMutation({
    mutationFn: checkIntegrity,
  })
}
