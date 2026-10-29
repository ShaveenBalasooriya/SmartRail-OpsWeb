import { ApiError } from '@/shared/api/ApiError'

const FALLBACK_MESSAGE = 'The change could not be published. Please try again.'
const FORBIDDEN_MESSAGE = 'You do not have permission to publish changes.'

// The API writes the 400, 404 and 409 details for the controller - minutes out of range, an unknown
// journey or change, a stop that has already departed - so they are shown exactly as sent rather than
// guessed at here. A 403 is the signed-in person's role, which this screen already knows; any other
// failure (including a 5xx or an unreadable body) has no message worth passing on.
export function publishErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return FALLBACK_MESSAGE
  }

  switch (error.status) {
    case 400:
    case 404:
    case 409:
      return error.message
    case 403:
      return FORBIDDEN_MESSAGE
    default:
      return FALLBACK_MESSAGE
  }
}
