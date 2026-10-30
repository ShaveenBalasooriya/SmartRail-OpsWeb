import { ApiError } from './ApiError'

// A 2xx body that does not match the contract. It is modelled as an ApiError with status 0, so a
// query surfaces it through the same error and retry state as a failed request; the message names
// what was wrong for the developer, while QueryState still shows its fixed user-facing sentence.
export function invalidResponse(message: string): ApiError {
  return new ApiError(0, 'UNKNOWN', `The server sent a response that could not be read. ${message}`)
}
