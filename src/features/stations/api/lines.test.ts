import { afterEach, describe, expect, it, vi } from 'vitest'
import { getLines } from './lines'

// Shaped like the real seeded network: two lines of five stations sharing the Colombo Fort interchange,
// exactly as GET /api/v1/network/lines returns them (LineDto with LineStationDto children).
const dtoFixture = [
  {
    id: '0196f2a0-0000-7000-8000-0000000000a1',
    code: 'COA',
    name: 'Coastal Line',
    stations: [
      { stationId: '0196f2a0-0000-7000-8000-000000000101', code: 'CMB', name: 'Colombo Fort', sequence: 1 },
      { stationId: '0196f2a0-0000-7000-8000-000000000102', code: 'KLP', name: 'Kollupitiya', sequence: 2 },
      { stationId: '0196f2a0-0000-7000-8000-000000000103', code: 'BMB', name: 'Bambalapitiya', sequence: 3 },
      { stationId: '0196f2a0-0000-7000-8000-000000000104', code: 'WLT', name: 'Wellawatte', sequence: 4 },
      { stationId: '0196f2a0-0000-7000-8000-000000000105', code: 'MLV', name: 'Mount Lavinia', sequence: 5 },
    ],
  },
  {
    id: '0196f2a0-0000-7000-8000-0000000000a2',
    code: 'MAI',
    name: 'Main Line',
    stations: [
      { stationId: '0196f2a0-0000-7000-8000-000000000101', code: 'CMB', name: 'Colombo Fort', sequence: 1 },
      { stationId: '0196f2a0-0000-7000-8000-000000000106', code: 'MDA', name: 'Maradana', sequence: 2 },
      { stationId: '0196f2a0-0000-7000-8000-000000000107', code: 'DMT', name: 'Dematagoda', sequence: 3 },
      { stationId: '0196f2a0-0000-7000-8000-000000000108', code: 'KLN', name: 'Kelaniya', sequence: 4 },
      { stationId: '0196f2a0-0000-7000-8000-000000000109', code: 'RGM', name: 'Ragama', sequence: 5 },
    ],
  },
]

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('getLines', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests the network lines and maps every line with its ordered stations', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(dtoFixture))
    vi.stubGlobal('fetch', fetchMock)

    const lines = await getLines()

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/network/lines')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toEqual({
      id: '0196f2a0-0000-7000-8000-0000000000a1',
      code: 'COA',
      name: 'Coastal Line',
      stations: [
        { stationId: '0196f2a0-0000-7000-8000-000000000101', code: 'CMB', name: 'Colombo Fort', sequence: 1 },
        { stationId: '0196f2a0-0000-7000-8000-000000000102', code: 'KLP', name: 'Kollupitiya', sequence: 2 },
        { stationId: '0196f2a0-0000-7000-8000-000000000103', code: 'BMB', name: 'Bambalapitiya', sequence: 3 },
        { stationId: '0196f2a0-0000-7000-8000-000000000104', code: 'WLT', name: 'Wellawatte', sequence: 4 },
        { stationId: '0196f2a0-0000-7000-8000-000000000105', code: 'MLV', name: 'Mount Lavinia', sequence: 5 },
      ],
    })
  })

  it('keeps the interchange on both lines rather than deduplicating the payload', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(dtoFixture)))

    const lines = await getLines()

    const coastal = lines[0]
    const main = lines[1]
    expect(coastal?.stations[0]?.stationId).toBe(main?.stations[0]?.stationId)
  })

  it('accepts a network of any size, including none', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(jsonResponse([])))

    const lines = await getLines()

    expect(lines).toEqual([])
  })
})
