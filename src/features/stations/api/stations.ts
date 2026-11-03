import { invalidResponse } from '@/shared/api/invalidResponse'
import { api } from '@/shared/api/client'
import { isLineColour } from '@/shared/lib/lineColour'
import type { Platform, Station, StationLine } from '../types'

// Wire shapes of SmartRail-API StationDto, PlatformDto and StationLineDto (openapi/v1.json, checked
// 2026-10-30), kept local to this file so a backend change touches only this mapping.
type StationDtoWire = {
  id: string
  code: string
  name: string
  isInterchange: boolean
  platforms: PlatformDtoWire[]
  lines: StationLineDtoWire[]
}

type PlatformDtoWire = {
  id: string
  stationId: string
  number: string
}

type StationLineDtoWire = {
  id: string
  code: string
  color: string
  name: string
}

export async function getStations(): Promise<Station[]> {
  const stations = await api.get<StationDtoWire[]>('/api/v1/network/stations')
  return stations.map(toStation)
}

export async function getStation(id: string): Promise<Station> {
  const station = await api.get<StationDtoWire>(`/api/v1/network/stations/${encodeURIComponent(id)}`)
  return toStation(station)
}

function toStation(station: StationDtoWire): Station {
  return {
    id: station.id,
    code: station.code,
    name: station.name,
    isInterchange: station.isInterchange,
    platforms: station.platforms.map(toPlatform),
    lines: station.lines.map(toStationLine),
  }
}

function toPlatform(platform: PlatformDtoWire): Platform {
  return { id: platform.id, stationId: platform.stationId, number: platform.number }
}

function toStationLine(line: StationLineDtoWire): StationLine {
  if (!isLineColour(line.color)) {
    throw invalidResponse(`Line ${line.code} has no valid colour.`)
  }

  return { id: line.id, code: line.code, color: line.color, name: line.name }
}
