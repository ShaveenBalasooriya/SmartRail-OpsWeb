import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/api/ApiError'
import { getStation, getStations } from './stations'

// Shaped like SmartRail-API StationDto (openapi/v1.json). The service maps every field it reads.
const dtoFixture = [
  {
    id: '0196f2a0-0000-7000-8000-000000000011',
    code: 'KDY',
    name: 'Kandy',
    isInterchange: true,
    platforms: [
      { id: '0196f2a0-0000-7000-8000-000000000021', stationId: '0196f2a0-0000-7000-8000-000000000011', number: '2' },
      { id: '0196f2a0-0000-7000-8000-000000000022', stationId: '0196f2a0-0000-7000-8000-000000000011', number: '1A' },
    ],
    lines: [{ id: '0196f2a0-0000-7000-8000-0000000000bb', code: 'KDY', name: 'Main Line' }],
  },
]

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('getStations', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests the network stations and maps each station with its platforms and lines', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(dtoFixture))
    vi.stubGlobal('fetch', fetchMock)

    const stations = await getStations()

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/network/stations')
    expect(stations).toEqual([
      {
        id: '0196f2a0-0000-7000-8000-000000000011',
        code: 'KDY',
        name: 'Kandy',
        isInterchange: true,
        platforms: [
          { id: '0196f2a0-0000-7000-8000-000000000021', stationId: '0196f2a0-0000-7000-8000-000000000011', number: '2' },
          { id: '0196f2a0-0000-7000-8000-000000000022', stationId: '0196f2a0-0000-7000-8000-000000000011', number: '1A' },
        ],
        lines: [{ id: '0196f2a0-0000-7000-8000-0000000000bb', code: 'KDY', name: 'Main Line' }],
      },
    ])
  })
})

describe('getStation', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests one station by id and maps it', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(dtoFixture[0]))
    vi.stubGlobal('fetch', fetchMock)

    const station = await getStation('0196f2a0-0000-7000-8000-000000000011')

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/network/stations/0196f2a0-0000-7000-8000-000000000011')
    expect(station.name).toBe('Kandy')
    expect(station.platforms.map((platform) => platform.number)).toEqual(['2', '1A'])
  })

  it('encodes the id in the path so it cannot change the request target', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(dtoFixture[0]))
    vi.stubGlobal('fetch', fetchMock)

    await getStation('../journeys?x=1')

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/network/stations/..%2Fjourneys%3Fx%3D1')
  })

  it('surfaces a 404 as a NOT_FOUND ApiError so the page can show its own state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ title: 'Not Found', detail: 'No such station.' }), {
          status: 404,
          headers: { 'Content-Type': 'application/problem+json' },
        }),
      ),
    )

    const error: unknown = await getStation('missing').catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 404, code: 'NOT_FOUND', message: 'No such station.' })
  })
})
