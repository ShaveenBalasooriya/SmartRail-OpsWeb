// Theme and motion preferences. index.html runs the same resolution before first paint; keep the
// storage keys, allow-lists and fallbacks in sync with that script.

export type Theme = 'light' | 'dark'
export type Motion = 'full' | 'reduced'

export const THEME_VALUES: Theme[] = ['light', 'dark']
export const MOTION_VALUES: Motion[] = ['full', 'reduced']

const THEME_KEY = 'smartrail.theme'
const MOTION_KEY = 'smartrail.motion'

// Storage can be unavailable (privacy modes, blocked cookies) and holds untrusted text, so reads
// are guarded and checked against the allow-list.
function readStored<T extends string>(key: string, allowed: T[]): T | null {
  try {
    const value = window.localStorage.getItem(key)
    return allowed.find((candidate) => candidate === value) ?? null
  } catch {
    return null
  }
}

function prefersMedia(query: string): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(query).matches
}

// Stored choice wins; otherwise follow the OS. Nothing is written here, so an OS preference is never
// frozen into a user choice just because the page loaded.
export function resolveInitialTheme(): Theme {
  return readStored(THEME_KEY, THEME_VALUES) ?? (prefersMedia('(prefers-color-scheme: dark)') ? 'dark' : 'light')
}

export function resolveInitialMotion(): Motion {
  return readStored(MOTION_KEY, MOTION_VALUES) ?? (prefersMedia('(prefers-reduced-motion: reduce)') ? 'reduced' : 'full')
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
}

export function applyMotion(motion: Motion): void {
  document.documentElement.dataset.motion = motion
}

// Only explicit toggles from the navbar call these.
export function storeTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_KEY, theme)
  } catch {
    // The choice still applies for this page view; it simply will not persist.
  }
}

export function storeMotion(motion: Motion): void {
  try {
    window.localStorage.setItem(MOTION_KEY, motion)
  } catch {
    // Same as storeTheme: the choice applies for this page view only.
  }
}
