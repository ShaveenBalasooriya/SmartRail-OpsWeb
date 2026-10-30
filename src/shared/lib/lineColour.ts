import type { CSSProperties } from 'react'

// A line's colour is data: the API sends every line with its own lowercase hex, and the UI never
// carries a palette of its own. Both helpers below therefore take the hex as input rather than
// naming a colour.

const LINE_COLOUR_PATTERN = /^#[0-9a-f]{6}$/

// The API promises lowercase #rrggbb. Anything else is a broken contract, not a colour to guess at,
// so the callers reject the whole response instead of drawing a default.
export function isLineColour(value: unknown): value is string {
  return typeof value === 'string' && LINE_COLOUR_PATTERN.test(value)
}

// The minimum lightness a line needs to stay readable on the dark theme's #0b1220 surface. The
// source hue and saturation are kept, so every line remains recognisably its own colour.
const DARK_THEME_MIN_LIGHTNESS = 0.7

// A lightened variant for the dark theme, derived from the API's hex rather than from a second
// palette. The transform is in HSL so only lightness moves; an already-light colour is unchanged.
export function darkThemeVariant(hex: string): string {
  const { r, g, b } = parseHex(hex)
  const { h, s, l } = rgbToHsl(r, g, b)
  if (l >= DARK_THEME_MIN_LIGHTNESS) {
    return hex
  }
  return hslToHex(h, s, DARK_THEME_MIN_LIGHTNESS)
}

// CSS custom properties set from data. The module's styles pick the light value by default and the
// dark value under [data-theme='dark'], so the theme switch needs no React state here.
export function lineColourStyle(hex: string): CSSProperties {
  return {
    '--line-colour': hex,
    '--line-colour-dark': darkThemeVariant(hex),
  } as CSSProperties
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  }
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const red = r / 255
  const green = g / 255
  const blue = b / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const l = (max + min) / 2
  const delta = max - min

  if (delta === 0) {
    return { h: 0, s: 0, l }
  }

  const s = delta / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === red) {
    h = ((green - blue) / delta) % 6
  } else if (max === green) {
    h = (blue - red) / delta + 2
  } else {
    h = (red - green) / delta + 4
  }

  return { h: (h * 60 + 360) % 360, s, l }
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2

  let rgb: [number, number, number]
  if (h < 60) {
    rgb = [c, x, 0]
  } else if (h < 120) {
    rgb = [x, c, 0]
  } else if (h < 180) {
    rgb = [0, c, x]
  } else if (h < 240) {
    rgb = [0, x, c]
  } else if (h < 300) {
    rgb = [x, 0, c]
  } else {
    rgb = [c, 0, x]
  }

  const channel = (value: number) =>
    Math.round((value + m) * 255)
      .toString(16)
      .padStart(2, '0')

  return `#${channel(rgb[0])}${channel(rgb[1])}${channel(rgb[2])}`
}
