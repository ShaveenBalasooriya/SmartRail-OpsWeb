import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/api/ApiError'
import { getAuditEntry } from '../api/audit'
import type { AuditEntryDetail } from '../types'
import AuditEntryDetailPage from './AuditEntryDetailPage'

vi.mock('../api/audit')

const ENTRY_ID = '0196f2a0-0000-7000-8000-000000000002'
const ACTOR_ID = '0196f2a0-0000-7000-8000-0000000000aa'
const TARGET_ID = '0196f2a0-0000-7000-8000-0000000000bb'
const RELATED_ID = '0196f2a0-0000-7000-8000-000000000001'

const detail: AuditEntryDetail = {
  id: ENTRY_ID,
  chainPosition: 2,
  occurredAt: '2026-10-28T03:30:00Z',
  actorStaffId: ACTOR_ID,
  actorRole: 'guard',
  action: 'platform.changed',
  outcome: 'succeeded',
  targetType: 'journey',
  targetId: TARGET_ID,
  before: { platformId: 'platform-old', stops: [1, 2] },
  after: { platformId: 'platform-new', stops: [1, 3] },
  relatedEntryId: RELATED_ID,
  previousHash: 'a'.repeat(64),
  entryHash: 'b'.repeat(64),
}

function renderPage(path = `/audit/${ENTRY_ID}`) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const url = new URL(path, 'http://localhost')

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[{ pathname: url.pathname, search: url.search }]}>
        <Routes>
          <Route path="/audit/:entryId" element={<AuditEntryDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AuditEntryDetailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows a loading indicator while the entry is pending', () => {
    vi.mocked(getAuditEntry).mockReturnValue(new Promise(() => {}))

    renderPage()

    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
  })

  it('shows the not-found state for a 404', async () => {
    vi.mocked(getAuditEntry).mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'No such entry.'))

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Audit entry not found' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows every field, before and after as formatted JSON, and the hashes in monospace', async () => {
    vi.mocked(getAuditEntry).mockResolvedValue(detail)

    renderPage(`/audit/${ENTRY_ID}?outcome=denied&page=2`)

    expect(await screen.findByRole('heading', { level: 1, name: 'Audit entry' })).toBeInTheDocument()
    expect(await screen.findByText(ENTRY_ID)).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('28 Oct 2026, 09:00')).toBeInTheDocument()
    expect(screen.getByText('guard')).toBeInTheDocument()
    expect(screen.getByText(ACTOR_ID)).toBeInTheDocument()
    expect(screen.getByText('platform.changed')).toBeInTheDocument()
    expect(screen.getByText('Succeeded')).toBeInTheDocument()
    expect(screen.getByText('journey')).toBeInTheDocument()
    expect(screen.getByText(TARGET_ID)).toBeInTheDocument()

    const before = screen.getByRole('heading', { name: 'Before' }).closest('section')
    const after = screen.getByRole('heading', { name: 'After' }).closest('section')
    expect(before).not.toBeNull()
    expect(after).not.toBeNull()
    expect(before?.querySelector('pre')).toHaveTextContent('"platformId": "platform-old"')
    expect(after?.querySelector('pre')).toHaveTextContent('"platformId": "platform-new"')

    expect(screen.getByText('a'.repeat(64))).toBeInTheDocument()
    expect(screen.getByText('b'.repeat(64))).toBeInTheDocument()
  })

  it('links to the related entry and back to the list with the same filters and page', async () => {
    vi.mocked(getAuditEntry).mockResolvedValue(detail)

    renderPage(`/audit/${ENTRY_ID}?outcome=denied&page=2`)

    expect(await screen.findByRole('link', { name: RELATED_ID })).toHaveAttribute(
      'href',
      `/audit/${RELATED_ID}?outcome=denied&page=2`,
    )
    expect(screen.getByRole('link', { name: 'Back to audit' })).toHaveAttribute(
      'href',
      '/audit?outcome=denied&page=2',
    )
  })
})
