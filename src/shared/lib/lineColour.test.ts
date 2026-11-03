import { describe, expect, it } from 'vitest'
import { darkThemeVariant, isLineColour, lineColourStyle } from './lineColour'

describe('isLineColour', () => {
  it.each(['#0f766e', '#1d4ed8', '#ffffff', '#000000'])('accepts the API colour %s', (value) => {
    expect(isLineColour(value)).toBe(true)
  })

  it.each([undefined, null, '', '#0F766E', '#1d4ed', '#1d4ed8ff', 'teal', 123])(
    'rejects %j',
    (value) => {
      expect(isLineColour(value)).toBe(false)
    },
  )
})

describe('darkThemeVariant', () => {
  it('lightens a line colour to stay readable on the dark surface, keeping its hue', () => {
    expect(darkThemeVariant('#0f766e')).toBe('#77eee5')
    expect(darkThemeVariant('#1d4ed8')).toBe('#7897ed')
  })

  it('leaves an already-light colour untouched', () => {
    expect(darkThemeVariant('#a7f3d0')).toBe('#a7f3d0')
  })
})

describe('lineColourStyle', () => {
  it('sets the light hex and the derived dark hex as custom properties', () => {
    expect(lineColourStyle('#0f766e')).toEqual({
      '--line-colour': '#0f766e',
      '--line-colour-dark': '#77eee5',
    })
  })
})
