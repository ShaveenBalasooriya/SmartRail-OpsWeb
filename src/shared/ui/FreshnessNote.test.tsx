import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import FreshnessNote from './FreshnessNote'

// 2026-10-22T04:42:05Z is 10:12:05 in the railway zone (Asia/Colombo, UTC+5:30).
const UPDATED_AT = Date.parse('2026-10-22T04:42:05Z')

describe('FreshnessNote', () => {
  it('shows the last update time in the railway time zone', () => {
    render(<FreshnessNote updatedAt={UPDATED_AT} isFetching={false} onRefresh={vi.fn()} />)

    expect(screen.getByText(/Last updated/)).toHaveTextContent('Last updated 10:12:05')
    expect(screen.getByText('10:12:05')).toHaveAttribute('dateTime', '2026-10-22T04:42:05.000Z')
  })

  it('renders no time line before any data has arrived', () => {
    render(<FreshnessNote updatedAt={0} isFetching={false} onRefresh={vi.fn()} />)

    expect(screen.queryByText(/Last updated/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument()
  })

  it('disables the button and says so while a fetch is running', () => {
    render(<FreshnessNote updatedAt={UPDATED_AT} isFetching onRefresh={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Refreshing…' })).toBeDisabled()
  })

  it('calls onRefresh when the user asks for a refresh', async () => {
    const onRefresh = vi.fn()
    render(<FreshnessNote updatedAt={UPDATED_AT} isFetching={false} onRefresh={onRefresh} />)

    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }))

    expect(onRefresh).toHaveBeenCalledTimes(1)
  })
})
