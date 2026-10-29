import { useQuery } from '@tanstack/react-query'
import { getAuditEntry } from '../api/audit'

// A single entry is cached separately from the list (the filters and page objects never equal an id
// string), so visiting an entry and coming back does not re-read the list.
export function useAuditEntry(id: string) {
  return useQuery({
    queryKey: ['audit', 'entries', id],
    queryFn: () => getAuditEntry(id),
    enabled: id !== '',
  })
}
