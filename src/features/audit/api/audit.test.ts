import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/api/ApiError'
import { EMPTY_AUDIT_FILTERS } from '../lib/auditFilters'
import { checkIntegrity, getAuditEntries, getAuditEntry } from './audit'

const ENTRY_ID = '0196f2a0-0000-7000-8000-000000000002'
const ACTOR_ID = '0196f2a0-0000-7000-8000-0000000000aa'
const TARGET_ID = '0196f2a0-0000-7000-8000-0000000000bb'
const RELATED_ID = '0196f2a0-0000-7000-8000-000000000001'

// Shaped like the API's AuditEntryListItem. The extra list fields are here to prove the mapper ignores
// what the list endpoint deliberately does not send. The numbers are strings where the host's schema
// allows integer or string, so the mapping parses both forms.
const listItemWire = {
  id: ENTRY_ID,
  chainPosition: '2',
  occurredAt: '2026-10-28T03:30:00Z',
  actorStaffId: ACTOR_ID,
  actorRole: 'guard',
  action: 'departure.recorded',
  outcome: 'denied',
  targetType: 'journey',
  targetId: TARGET_ID,
  before: { ignored: true },
  previousHash: 'ignored',
  entryHash: 'ignored',
}

const pageWire = {
  items: [listItemWire],
  page: '2',
  pageSize: '25',
  totalCount: '26',
  totalPages: '2',
  hasNextPage: false,
  hasPreviousPage: true,
}

const detailWire = {
  id: ENTRY_ID,
  chainPosition: '2',
  occurredAt: '2026-10-28T03:30:00Z',
  actorStaffId: ACTOR_ID,
  actorRole: 'guard',
  action: 'departure.recorded',
  outcome: 'succeeded',
  targetType: 'journey',
  targetId: TARGET_ID,
  before: { platformId: 'platform-old' },
  after: { platformId: 'platform-new' },
  relatedEntryId: RELATED_ID,
  previousHash: 'a'.repeat(64),
  entryHash: 'b'.repeat(64),
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function requestUrl(call: unknown): URL {
  return new URL(String(call), 'http://localhost')
}

describe('getAuditEntries', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('builds the query from every filter and maps the list envelope', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(pageWire))
    vi.stubGlobal('fetch', fetchMock)

    const result = await getAuditEntries(
      {
        actorId: ACTOR_ID,
        from: '2026-10-28T03:30:00.000Z',
        to: '2026-10-28T12:00:00.000Z',
        outcome: 'denied',
      },
      2,
    )

    const url = requestUrl(fetchMock.mock.calls[0]?.[0])
    expect(url.pathname).toBe('/api/v1/audit/entries')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      actorId: ACTOR_ID,
      from: '2026-10-28T03:30:00.000Z',
      to: '2026-10-28T12:00:00.000Z',
      outcome: 'denied',
      page: '2',
      pageSize: '25',
    })

    expect(result).toEqual({
      items: [
        {
          id: ENTRY_ID,
          chainPosition: 2,
          occurredAt: '2026-10-28T03:30:00Z',
          actorStaffId: ACTOR_ID,
          actorRole: 'guard',
          action: 'departure.recorded',
          outcome: 'denied',
          targetType: 'journey',
          targetId: TARGET_ID,
        },
      ],
      page: 2,
      pageSize: 25,
      totalCount: 26,
      totalPages: 2,
      hasNextPage: false,
      hasPreviousPage: true,
    })
  })

  it('omits empty filters and outcome "all" from the query string', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ ...pageWire, items: [] }))
    vi.stubGlobal('fetch', fetchMock)

    await getAuditEntries(EMPTY_AUDIT_FILTERS, 1)

    const url = requestUrl(fetchMock.mock.calls[0]?.[0])
    expect([...url.searchParams.keys()]).toEqual(['page', 'pageSize'])
    expect(Object.fromEntries(url.searchParams)).toEqual({ page: '1', pageSize: '25' })
  })

  it('fails loudly when a position is not a whole number', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        jsonResponse({ ...pageWire, items: [{ ...listItemWire, chainPosition: 'second' }] }),
      ),
    )

    await expect(getAuditEntries(EMPTY_AUDIT_FILTERS, 1)).rejects.toThrow('not a whole number')
  })
})

describe('getAuditEntry', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests one entry and maps its JSON values and hashes', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(detailWire))
    vi.stubGlobal('fetch', fetchMock)

    const entry = await getAuditEntry(ENTRY_ID)

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`/api/v1/audit/entries/${ENTRY_ID}`)
    expect(entry).toEqual({
      id: ENTRY_ID,
      chainPosition: 2,
      occurredAt: '2026-10-28T03:30:00Z',
      actorStaffId: ACTOR_ID,
      actorRole: 'guard',
      action: 'departure.recorded',
      outcome: 'succeeded',
      targetType: 'journey',
      targetId: TARGET_ID,
      before: { platformId: 'platform-old' },
      after: { platformId: 'platform-new' },
      relatedEntryId: RELATED_ID,
      previousHash: 'a'.repeat(64),
      entryHash: 'b'.repeat(64),
    })
  })

  it('surfaces a 404 as an ApiError with the problem detail message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        jsonResponse({ title: 'Not Found', detail: 'No audit entry has that id.' }, 404),
      ),
    )

    const failure = await getAuditEntry(ENTRY_ID).catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(ApiError)
    expect(failure).toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      message: 'No audit entry has that id.',
    })
  })
})

describe('checkIntegrity', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns an intact result without a failing position', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ status: 'intact', entriesChecked: '12' }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(checkIntegrity()).resolves.toEqual({ status: 'intact', entriesChecked: 12 })
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/audit/integrity')
  })

  it('returns a broken result with the first failing position', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        jsonResponse({ status: 'broken', firstFailingPosition: '3', entriesChecked: '12' }),
      ),
    )

    await expect(checkIntegrity()).resolves.toEqual({
      status: 'broken',
      firstFailingPosition: 3,
      entriesChecked: 12,
    })
  })

  it('fails loudly when a broken report omits the failing position', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ status: 'broken', entriesChecked: 12 })),
    )

    await expect(checkIntegrity()).rejects.toThrow('without a failing position')
  })
})
