import { useSearchParams } from 'react-router'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import {
  isJourneyDirectionFilter,
  isJourneyStatusFilter,
  type JourneyDirectionFilter,
  type JourneyStatusFilter,
} from '../types'

const SEARCH_DEBOUNCE_MS = 300

const PARAM = {
  search: 'q',
  line: 'line',
  direction: 'direction',
  status: 'status',
} as const

// Every filter lives in the URL, so a filtered board can be refreshed, shared or bookmarked. Each change uses
// replace so the history does not fill with one entry per keystroke. Search is also debounced, so the table is
// not filtered on every character. The URL is untrusted: an unknown status or direction falls back to "all"
// instead of hiding every row.
export function useJourneyFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const search = searchParams.get(PARAM.search) ?? ''
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS)

  const rawStatus = searchParams.get(PARAM.status)
  const status: JourneyStatusFilter =
    rawStatus !== null && isJourneyStatusFilter(rawStatus) ? rawStatus : 'all'

  const rawDirection = searchParams.get(PARAM.direction)
  const direction: JourneyDirectionFilter =
    rawDirection !== null && isJourneyDirectionFilter(rawDirection) ? rawDirection : 'all'

  const line = searchParams.get(PARAM.line) ?? 'all'

  function setParam(key: string, value: string) {
    setSearchParams(
      (previous) => {
        const updated = new URLSearchParams(previous)
        if (value === 'all' || value === '') {
          // The default removes the parameter, so the default URL stays clean.
          updated.delete(key)
        } else {
          updated.set(key, value)
        }
        return updated
      },
      { replace: true },
    )
  }

  return {
    search,
    setSearch: (value: string) => setParam(PARAM.search, value),
    line,
    setLine: (value: string) => setParam(PARAM.line, value),
    direction,
    setDirection: (value: JourneyDirectionFilter) => setParam(PARAM.direction, value),
    status,
    setStatus: (value: JourneyStatusFilter) => setParam(PARAM.status, value),
    debouncedSearch,
  }
}
