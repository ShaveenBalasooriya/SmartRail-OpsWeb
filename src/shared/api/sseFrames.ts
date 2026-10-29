// The text/event-stream frame parser, kept free of fetch and timers so the wire format can be tested
// on its own. It follows the Server-Sent Events spec for the parts this app receives: comments,
// id/event/data fields, multi-line data, CR, LF and CRLF line endings, and fields split across chunks.
export type SseFrame = {
  // null when the frame carried no id. The caller keeps the last id it saw, so a reset frame with no
  // id must not clear it.
  id: string | null
  // "message" when the frame carried no event field, as the spec says.
  event: string
  data: string
  // The server's reconnect hint, when it sent one. The client has its own backoff policy, so this is
  // carried for completeness rather than obeyed.
  retry: number | null
}

export type SseFrameParser = {
  push: (chunk: string) => SseFrame[]
}

export function createSseFrameParser(): SseFrameParser {
  let buffer = ''
  let data = ''
  let event = ''
  let id: string | null = null
  let pendingRetry: number | null = null

  return {
    push(chunk) {
      buffer += chunk
      const frames: SseFrame[] = []

      for (;;) {
        const terminator = /\r\n|\r|\n/.exec(buffer)
        if (terminator === null) {
          break
        }

        // A trailing CR may be the first half of a CRLF that has not arrived yet.
        if (terminator[0] === '\r' && terminator.index === buffer.length - 1) {
          break
        }

        const line = buffer.slice(0, terminator.index)
        buffer = buffer.slice(terminator.index + terminator[0].length)

        if (line === '') {
          const frame = dispatch()
          if (frame !== null) {
            frames.push(frame)
          }
          continue
        }

        consume(line)
      }

      return frames
    },
  }

  function consume(line: string): void {
    // A line starting with a colon is a comment, which is what the server's keep-alive heartbeat is.
    if (line.startsWith(':')) {
      return
    }

    const colon = line.indexOf(':')
    const field = colon === -1 ? line : line.slice(0, colon)
    let value = colon === -1 ? '' : line.slice(colon + 1)
    if (value.startsWith(' ')) {
      value = value.slice(1)
    }

    switch (field) {
      case 'data':
        data += `${value}\n`
        break
      case 'event':
        event = value
        break
      case 'id':
        // The spec forbids a NUL in an id; such a field is ignored rather than stored.
        if (!value.includes('\u0000')) {
          id = value
        }
        break
      case 'retry':
        if (/^\d+$/.test(value)) {
          pendingRetry = Number.parseInt(value, 10)
        }
        break
      default:
        // An unknown field is ignored, as the spec requires.
        break
    }
  }

  function dispatch(): SseFrame | null {
    const frame: SseFrame | null =
      data === ''
        ? null
        : {
            id,
            event: event === '' ? 'message' : event,
            data: data.slice(0, -1),
            retry: pendingRetry,
          }

    data = ''
    event = ''
    id = null
    if (frame !== null) {
      pendingRetry = null
    }

    return frame
  }
}
