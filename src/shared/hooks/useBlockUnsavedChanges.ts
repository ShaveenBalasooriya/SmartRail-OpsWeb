import { useRef } from 'react'
import { useBlocker } from 'react-router'

// A ref, not state, marks a successful save. The blocker reads it at the moment of navigation. The save
// calls markSubmitted() and then navigate() in the same handler, before React re-renders. State set in
// that handler would not be visible to the blocker yet, so the form would block its own redirect.
export function useBlockUnsavedChanges(isDirty: boolean) {
  const didSubmit = useRef(false)
  const blocker = useBlocker(() => isDirty && !didSubmit.current)

  function markSubmitted() {
    didSubmit.current = true
  }

  return { blocker, markSubmitted }
}
