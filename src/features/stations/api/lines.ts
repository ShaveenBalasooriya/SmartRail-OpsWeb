import { api } from '@/shared/api/client'
import type { Line, LineStation } from '../types'

// Wire shapes of SmartRail-API LineDto and LineStationDto
// (src/Contracts/SmartRail.RailNetwork.Contracts/NetworkCatalog.cs, checked 2026-10-28). They are kept
// local to this file so a backend change touches only this mapping.
type LineStationDtoWire = {
  stationId: string
  code: string
  name: string
  // The API's LineStationDto.Sequence is an int, so it arrives as a JSON number.
  sequence: number
}

type LineDtoWire = {
  id: string
  code: string
  name: string
  stations: LineStationDtoWire[]
}

// Every line with its distinct stations in sequence order. The endpoint is public, and the map is the
// only screen that reads it.
export async function getLines(): Promise<Line[]> {
  const lines = await api.get<LineDtoWire[]>('/api/v1/network/lines')
  return lines.map((line) => ({
    id: line.id,
    code: line.code,
    name: line.name,
    stations: line.stations.map(toLineStation),
  }))
}

function toLineStation(station: LineStationDtoWire): LineStation {
  return {
    stationId: station.stationId,
    code: station.code,
    name: station.name,
    sequence: station.sequence,
  }
}
