import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAuditEntries } from '../api/audit'
import { EMPTY_AUDIT_FILTERS } from '../lib/auditFilters'
import type { AuditEntryListItem, AuditPage as AuditPageResult } from '../types'
import AuditPage from './AuditPage'

vi.mock('../api/audit')

const ACTOR_ID = '0196f2a0-0000-7000-8000-0000000000aa'
const DENIED_ID = '0196f2a0-0000-7000-8000-000000000002'
const SUCCEEDED_ID = '0196f2a0-0000-7000-8000-000000000003'

const deniedEntry: AuditEntryListItem = {
  id: DENIED_ID,
  chainPosition: 2,
  occurredAt: '2026-10-28T03:30:00Z',
  actorStaffId: ACTOR_ID,
  actorRole: 'guard',
  action: 'departure.recorded',
  outcome: 'denied',
  targetType: 'journey',
  targetId: '0196f2a0-0000-7000-8000-0000000000bb',
}

const succeededEntry: AuditEntryListItem = {
  id: SUCCEEDED_ID,
  chainPosition: 1,
  occurredAt: '2026-10-28T03:00:00Z',
  actorStaffId: ACTOR_ID,
  actorRole: 'network_controller',
  action: 'delay.published',
  outcome: 'succeeded',
  targetType: 'journey',
  targetId: null,
}

function pageOf(
  items: AuditEntryListItem[],
  overrides: Partial<AuditPageResult<AuditEntryListItem>> = {},
): AuditPageResult<AuditEntryListItem> {
  return {
    items,
    page: 1,
    pageSize: 25,
    totalCount: items.length,
    totalPages: items.length === 0 ? 0 : 1,
    hasNextPage: false,
    hasPreviousPage: false,
    ...overrides,
  }
}

function renderPage(path = '/audit') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AuditPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AuditPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('shows a loading indicator while the entries are pending', () => {
    vi.mocked(getAuditEntries).mockReturnValue(new Promise(() => {}))

    renderPage()

    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
  })

  it('renders the design header and a captioned table with scoped column headers', async () => {
    vi.mocked(getAuditEntries).mockResolvedValue(pageOf([succeededEntry]))

    renderPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'Audit' })).toBeInTheDocument()
    expect(screen.getByText('Recorded actions, newest first. Read-only.')).toBeInTheDocument()

    const table = await screen.findByRole('table', { name: 'Audit entries' })
    const headers = within(table).getAllByRole('columnheader')

    expect(headers.map((header) => header.textContent)).toEqual([
      'Position',
      'Time',
      'Actor',
      'Action',
      'Outcome',
      'Target',
    ])
    headers.forEach((header) => expect(header).toHaveAttribute('scope', 'col'))
  })

  it('lists the entries newest first with actor role, short id, outcome text and target', async () => {
    vi.mocked(getAuditEntries).mockResolvedValue(pageOf([deniedEntry, succeededEntry]))

    renderPage()

    const row = await screen.findByRole('row', { name: /departure\.recorded/ })
    expect(row).toHaveTextContent('2')
    expect(row).toHaveTextContent('28 Oct 2026, 09:00')
    expect(row).toHaveTextContent('guard')
    expect(within(row).getByTitle(ACTOR_ID)).toHaveTextContent('0196f2a0')
    expect(within(row).getByText('Denied')).toBeInTheDocument()
    expect(row).toHaveTextContent('journey')
    expect(within(row).getByRole('link', { name: 'departure.recorded' })).toHaveAttribute(
      'href',
      `/audit/${DENIED_ID}`,
    )
    expect(screen.getByText('Page 1 of 1, 2 entries')).toBeInTheDocument()
  })

  it('carries the filters and page into an entry link', async () => {
    vi.mocked(getAuditEntries).mockResolvedValue(
      pageOf([deniedEntry], { page: 2, totalPages: 2, hasPreviousPage: true }),
    )

    renderPage('/audit?outcome=denied&page=2')

    expect(await screen.findByRole('link', { name: 'departure.recorded' })).toHaveAttribute(
      'href',
      `/audit/${DENIED_ID}?outcome=denied&page=2`,
    )
  })

  it('pages forward using the server paging flags', async () => {
    const user = userEvent.setup()
    vi.mocked(getAuditEntries)
      .mockResolvedValueOnce(
        pageOf([deniedEntry], {
          page: 1,
          totalCount: 2,
          totalPages: 2,
          hasNextPage: true,
        }),
      )
      .mockResolvedValueOnce(
        pageOf([succeededEntry], {
          page: 2,
          totalCount: 2,
          totalPages: 2,
          hasPreviousPage: true,
        }),
      )

    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Next' }))

    expect(await screen.findByText('delay.published')).toBeInTheDocument()
    expect(getAuditEntries).toHaveBeenLastCalledWith(EMPTY_AUDIT_FILTERS, 2, 25)
    expect(screen.getByText('Page 2 of 2, 2 entries')).toBeInTheDocument()
  })

  it('says nothing has been recorded when the record is empty and no filters are active', async () => {
    vi.mocked(getAuditEntries).mockResolvedValue(pageOf([]))

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Nothing has been recorded yet.' })).toBeInTheDocument()
  })

  it('says no entries match when filters are active, and clears them', async () => {
    const user = userEvent.setup()
    vi.mocked(getAuditEntries).mockResolvedValue(pageOf([]))

    renderPage('/audit?outcome=denied')

    expect(await screen.findByRole('heading', { name: 'No entries match these filters.' })).toBeInTheDocument()

    const clearButtons = screen.getAllByRole('button', { name: 'Clear filters' })
    await user.click(clearButtons[clearButtons.length - 1] as HTMLElement)

    expect(await screen.findByRole('heading', { name: 'Nothing has been recorded yet.' })).toBeInTheDocument()
    expect(getAuditEntries).toHaveBeenLastCalledWith(EMPTY_AUDIT_FILTERS, 1, 25)
  })

  it('says a page past the end has no entries and offers the first page', async () => {
    const user = userEvent.setup()
    vi.mocked(getAuditEntries)
      .mockResolvedValueOnce(
        pageOf([], { page: 99, totalCount: 5, totalPages: 1, hasPreviousPage: true }),
      )
      .mockResolvedValueOnce(pageOf([succeededEntry]))

    renderPage('/audit?page=99')

    expect(await screen.findByRole('heading', { name: 'No entries on this page.' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Go to the first page' }))

    expect(await screen.findByText('delay.published')).toBeInTheDocument()
    expect(getAuditEntries).toHaveBeenLastCalledWith(EMPTY_AUDIT_FILTERS, 1, 25)
  })

  it('shows the error state and retries', async () => {
    const user = userEvent.setup()
    vi.mocked(getAuditEntries)
      .mockRejectedValueOnce(new Error('The audit record could not load.'))
      .mockResolvedValueOnce(pageOf([succeededEntry]))

    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('delay.published')).toBeInTheDocument()
  })

  it('shows an actor-id error from the URL without calling the API', async () => {
    renderPage('/audit?actorId=not-a-guid')

    expect(await screen.findByText('Actor id must be a GUID.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Filters need attention' })).toBeInTheDocument()
    expect(getAuditEntries).not.toHaveBeenCalled()
  })

  it('does not apply an invalid actor id typed into the form', async () => {
    const user = userEvent.setup()
    vi.mocked(getAuditEntries).mockResolvedValue(pageOf([]))

    renderPage()

    await screen.findByRole('heading', { name: 'Nothing has been recorded yet.' })
    const callsBefore = vi.mocked(getAuditEntries).mock.calls.length

    await user.type(screen.getByLabelText('Actor staff id'), 'not-a-guid')
    await user.click(screen.getByRole('button', { name: 'Apply filters' }))

    expect(screen.getByText('Actor id must be a GUID.')).toBeInTheDocument()
    expect(getAuditEntries).toHaveBeenCalledTimes(callsBefore)
  })

  it('shows a time-range error from the URL without calling the API', async () => {
    renderPage('/audit?from=2026-10-28T12:00&to=2026-10-28T11:00')

    expect(await screen.findByText('The start must not be after the end.')).toBeInTheDocument()
    expect(getAuditEntries).not.toHaveBeenCalled()
  })

  it('validates, then applies actor, time range and outcome as ISO instants', async () => {
    const user = userEvent.setup()
    vi.mocked(getAuditEntries).mockResolvedValue(pageOf([]))

    renderPage()

    await screen.findByRole('heading', { name: 'Nothing has been recorded yet.' })
    await user.type(screen.getByLabelText('Actor staff id'), ACTOR_ID)
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-28T09:00' } })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-10-28T17:30' } })
    await user.selectOptions(screen.getByLabelText('Outcome'), 'denied')
    await user.click(screen.getByRole('button', { name: 'Apply filters' }))

    await waitFor(() =>
      expect(getAuditEntries).toHaveBeenLastCalledWith(
        {
          actorId: ACTOR_ID,
          from: '2026-10-28T03:30:00.000Z',
          to: '2026-10-28T12:00:00.000Z',
          outcome: 'denied',
        },
        1,
        25,
      ),
    )
  })
})
