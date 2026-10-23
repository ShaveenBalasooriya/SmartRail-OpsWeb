import { ApiError } from '@/shared/api/ApiError'

const FALLBACK_MESSAGE = 'The change could not be published. Please try again.'

// Only the status is read, never the message text, except for 409: the server's conflict message says what
// is wrong (already departed, already cancelled, same platform), so it is shown as it is.
export function publishErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return FALLBACK_MESSAGE
  }

  switch (error.status) {
    case 400:
      return 'The change is not valid. Check the values and try again.'
    case 403:
      return 'You do not have permission to publish changes.'
    case 404:
      return 'This journey could not be found.'
    case 409:
      return error.message
    default:
      return FALLBACK_MESSAGE
  }
}
