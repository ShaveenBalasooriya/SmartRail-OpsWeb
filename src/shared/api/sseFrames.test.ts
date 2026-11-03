import { describe, expect, it } from 'vitest'
import { createSseFrameParser } from './sseFrames'

describe('createSseFrameParser', () => {
  it('reads one frame with an id, an event and JSON data', () => {
    const frames = createSseFrameParser().push(
      'id: 12\nevent: delay_published\ndata: {"journeyId":"j1"}\n\n',
    )

    expect(frames).toEqual([
      { id: '12', event: 'delay_published', data: '{"journeyId":"j1"}', retry: null },
    ])
  })

  it('joins multi-line data with newlines and drops the last one', () => {
    const frames = createSseFrameParser().push('data: first\ndata: second\n\n')

    expect(frames).toHaveLength(1)
    expect(frames[0]?.data).toBe('first\nsecond')
  })

  it('ignores comment lines such as the keep-alive heartbeat', () => {
    const frames = createSseFrameParser().push(': keep-alive\n\n')

    expect(frames).toEqual([])
  })

  it('uses "message" when a frame carries no event field', () => {
    const frames = createSseFrameParser().push('data: {}\n\n')

    expect(frames[0]?.event).toBe('message')
    expect(frames[0]?.id).toBeNull()
  })

  it('accepts CRLF and bare CR line endings', () => {
    const parser = createSseFrameParser()

    expect(parser.push('id: 3\r\nevent: reset\r\ndata: {}\r\n\r\n')).toHaveLength(1)

    // A chunk ending in a bare CR holds it back, because it may be the first half of a CRLF. The data
    // line's CR is held first, then the blank line's CR, and only the third CR completes the frame.
    expect(parser.push('id: 4\rdata: {}\r')).toEqual([])
    expect(parser.push('\r')).toEqual([])
    expect(parser.push('\r')).toEqual([
      { id: '4', event: 'message', data: '{}', retry: null },
    ])
  })

  it('accepts a space-less field and strips only one leading space', () => {
    const frames = createSseFrameParser().push('data:{"a":1}\nid:7\n\n')

    expect(frames[0]?.data).toBe('{"a":1}')
    expect(frames[0]?.id).toBe('7')
  })

  it('parses a retry field without turning it into a frame', () => {
    const parser = createSseFrameParser()

    expect(parser.push('retry: 2500\n\n')).toEqual([])
    expect(parser.push('data: {}\n\n')[0]?.retry).toBe(2500)
  })

  it('keeps an incomplete line until the next chunk', () => {
    const parser = createSseFrameParser()

    expect(parser.push('id: 9\nevent: delay_pub')).toEqual([])
    expect(parser.push('lished\ndata: {"a":1}')).toEqual([])
    expect(parser.push('\n\n')).toEqual([
      { id: '9', event: 'delay_published', data: '{"a":1}', retry: null },
    ])
  })

  it('does not split CRLF that arrives across two chunks', () => {
    const parser = createSseFrameParser()

    expect(parser.push('data: {}\r')).toEqual([])
    expect(parser.push('\n\r\n')).toEqual([
      { id: null, event: 'message', data: '{}', retry: null },
    ])
  })

  it('does not emit a frame when a block has no data', () => {
    const frames = createSseFrameParser().push('id: 77\nevent: ignored\n\n')

    expect(frames).toEqual([])
  })

  it('ignores an id containing a NUL character', () => {
    const frames = createSseFrameParser().push('id: 1\u0000\n\n')

    expect(frames).toEqual([])
  })

  it('reports each frame separately and leaves no id on a reset frame', () => {
    const frames = createSseFrameParser().push(
      'id: 20\nevent: delay_published\ndata: {}\n\nevent: reset\ndata: {}\n\n',
    )

    expect(frames).toEqual([
      { id: '20', event: 'delay_published', data: '{}', retry: null },
      { id: null, event: 'reset', data: '{}', retry: null },
    ])
  })
})
