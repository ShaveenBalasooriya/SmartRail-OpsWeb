import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/api/ApiError'
import QueryState from './QueryState'

const ITEMS_EMPTY = (items: string[]) => items.length === 0

describe('QueryState', () => {
  it('shows a loading indicator while pending and does not render the data', () => {
    const children = vi.fn(() => null)

    render(
      <QueryState<string[]>
        isPending
        isError={false}
        error={null}
        data={undefined}
        isEmpty={ITEMS_EMPTY}
        emptyTitle="Nothing here"
        children={children}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
    expect(children).not.toHaveBeenCalled()
  })

  it('shows the error message and retries when the user asks', async () => {
    const onRetry = vi.fn()

    render(
      <QueryState<string[]>
        isPending={false}
        isError
        error={new Error('The board could not load.')}
        data={undefined}
        onRetry={onRetry}
        isEmpty={ITEMS_EMPTY}
        emptyTitle="Nothing here"
        children={() => null}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('The board could not load.')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('shows the not-found title for a 404 when one is supplied', () => {
    render(
      <QueryState<string[]>
        isPending={false}
        isError
        error={new ApiError(404, 'NOT_FOUND', 'No such journey.')}
        data={undefined}
        isEmpty={ITEMS_EMPTY}
        emptyTitle="Nothing here"
        notFoundTitle="Journey not found"
        children={() => null}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Journey not found' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the empty state when the server returned zero rows', () => {
    render(
      <QueryState<string[]>
        isPending={false}
        isError={false}
        error={null}
        data={[]}
        isEmpty={ITEMS_EMPTY}
        emptyTitle="No journeys today"
        emptyDescription="The timetable has no journeys for this day."
        children={() => null}
      />,
    )

    expect(screen.getByRole('heading', { name: 'No journeys today' })).toBeInTheDocument()
    expect(screen.getByText('The timetable has no journeys for this day.')).toBeInTheDocument()
  })

  it('passes the narrowed data to the render prop when there is data', () => {
    render(
      <QueryState<string[]>
        isPending={false}
        isError={false}
        error={null}
        data={['Kandy Express', 'Galle Local']}
        isEmpty={ITEMS_EMPTY}
        emptyTitle="Nothing here"
        children={(items) => <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>}
      />,
    )

    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })
})
