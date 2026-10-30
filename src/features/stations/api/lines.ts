import { invalidResponse } from '@/shared/api/invalidResponse'
import { api } from '@/shared/api/client'
import { isLineColour } from '@/shared/lib/lineColour'
import type { Line, LineStation } from '../types'

// Wire shapes of SmartRail-API LineDto and LineStationDto
// (src/Contracts/SmartRail.RailNetwork.Contracts/NetworkCatalog.cs, checked 2026-10-30). They are kept
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
  color: string
  name: string
  stations: LineStationDtoWire[]
}

// Every line with its distinct stations in sequence order. The endpoint is public, and the map is the
// only screen that reads it.
export async function getLines(): Promise<Line[]> {
  const lines = await api.get<LineDtoWire[]>('/api/v1/network/lines')
  return lines.map(toLine)
}

function toLine(line: LineDtoWire): Line {
  if (!isLineColour(line.color)) {
    throw invalidResponse(`Line ${line.code} has no valid colour.`)
  }

  return {
    id: line.id,
    code: line.code,
    color: line.color,
    name: line.name,
    stations: line.stations.map(toLineStation),
  }
}

function toLineStation(station: LineStationDtoWire): LineStation {
  return {
    stationId: station.stationId,
    code: station.code,
    name: station.name,
    sequence: station.sequence,
  }
}
