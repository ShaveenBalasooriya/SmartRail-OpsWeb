import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import DelayPill from './DelayPill'

describe('DelayPill', () => {
  it('says how late a positive delay is', () => {
    render(<DelayPill delayMinutes={15} />)

    expect(screen.getByText('15 min late')).toBeInTheDocument()
  })

  it('says how early a negative delay is', () => {
    render(<DelayPill delayMinutes={-5} />)

    expect(screen.getByText('5 min early')).toBeInTheDocument()
  })

  it('says on time when there is no delay', () => {
    render(<DelayPill delayMinutes={0} />)

    expect(screen.getByText('On time')).toBeInTheDocument()
  })

  it('uses minutes for a one-minute delay as well', () => {
    render(<DelayPill delayMinutes={1} />)

    expect(screen.getByText('1 min late')).toBeInTheDocument()
  })

  it('shows a dash when the API reports no delay', () => {
    render(<DelayPill delayMinutes={null} />)

    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
