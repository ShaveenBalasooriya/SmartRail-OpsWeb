import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { isJourneyStatusFilter, type JourneyStatusFilter } from '../types'

const SEARCH_DEBOUNCE_MS = 300

// Status lives in the URL so a filtered view can be refreshed or shared. Search is ephemeral, so it
// stays in local state. Status uses replace so each filter change does not add a history entry.
export function useJourneyFilters() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS)

  // The URL is untrusted. An unknown value falls back to "all" instead of hiding every row.
  const rawStatus = searchParams.get('status')
  const status: JourneyStatusFilter = rawStatus !== null && isJourneyStatusFilter(rawStatus) ? rawStatus : 'all'

  function setStatus(next: JourneyStatusFilter) {
    setSearchParams(
      (previous) => {
        const updated = new URLSearchParams(previous)
        if (next === 'all') {
          // "all" removes the parameter, so the default URL stays clean.
          updated.delete('status')
        } else {
          updated.set('status', next)
        }
        return updated
      },
      { replace: true },
    )
  }

  return { search, setSearch, status, setStatus, debouncedSearch }
}
