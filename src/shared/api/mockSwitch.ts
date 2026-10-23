// One flag per endpoint group. A group is mocked unless its flag is exactly 'true', so a new or missing
// flag never reaches a backend that does not exist yet (plan §2).
export type MockableGroup = 'operations' | 'audit' | 'stream'

export function isMocked(group: MockableGroup): boolean {
  return realFlag(group) !== 'true'
}

// Each flag is read by its full name, not through a computed key, so Vite can substitute it at build
// time. The value is read per call, not at import, so tests can change it with vi.stubEnv.
function realFlag(group: MockableGroup): string | undefined {
  switch (group) {
    case 'operations':
      return import.meta.env.VITE_USE_REAL_OPERATIONS
    case 'audit':
      return import.meta.env.VITE_USE_REAL_AUDIT
    case 'stream':
      return import.meta.env.VITE_USE_REAL_STREAM
  }
}
