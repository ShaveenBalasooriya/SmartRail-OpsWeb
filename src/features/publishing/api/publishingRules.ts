import { invalidResponse } from '@/shared/api/invalidResponse'
import { api } from '@/shared/api/client'
import type { DelayLimits } from '../types'

// Wire shape of GET /api/v1/operations/publishing-rules (checked against the running API on
// 2026-10-30): {"delay":{"minMinutes":1,"maxMinutes":720}}. Kept local to this file so a backend
// change touches only this mapping.

export type PublishingRules = {
  delay: DelayLimits
}

export async function getPublishingRules(): Promise<PublishingRules> {
  const body = await api.get<unknown>('/api/v1/operations/publishing-rules')
  return toPublishingRules(body)
}

function toPublishingRules(body: unknown): PublishingRules {
  if (!isRecord(body)) {
    throw invalidResponse('The publishing rules are not an object.')
  }

  return { delay: toDelayLimits(body.delay) }
}

function toDelayLimits(value: unknown): DelayLimits {
  if (!isRecord(value)) {
    throw invalidResponse('The publishing rules carry no delay limits.')
  }

  const { minMinutes, maxMinutes } = value
  if (
    !isWholeNumber(minMinutes) ||
    !isWholeNumber(maxMinutes) ||
    minMinutes < 1 ||
    maxMinutes <= minMinutes
  ) {
    throw invalidResponse('The delay limits are not a valid minute range.')
  }

  return { minMinutes, maxMinutes }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isWholeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value)
}
