import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { indexStations } from '@/features/stations/lib/stationLookup'
import type { Station } from '@/features/stations/types'
import type { StopOption } from '../lib/stopOptions'
import PlatformChangeForm from './PlatformChangeForm'

const stations: Station[] = [
  {
    id: 'st-kandy',
    code: 'KDY',
    name: 'Kandy',
    isInterchange: true,
    platforms: [
      { id: 'pl-kandy-10', stationId: 'st-kandy', number: '10' },
      { id: 'pl-kandy-2', stationId: 'st-kandy', number: '2' },
      { id: 'pl-kandy-3', stationId: 'st-kandy', number: '3' },
    ],
    lines: [],
  },
  {
    id: 'st-galle',
    code: 'GLE',
    name: 'Galle',
    isInterchange: false,
    platforms: [{ id: 'pl-galle-1', stationId: 'st-galle', number: '1' }],
    lines: [],
  },
]

const stops: StopOption[] = [
  { sequence: 2, stationId: 'st-kandy', stationName: 'Kandy', platformId: 'pl-kandy-2', label: 'Stop 2: Kandy' },
  { sequence: 3, stationId: 'st-galle', stationName: 'Galle', platformId: 'pl-galle-1', label: 'Stop 3: Galle' },
]

function renderForm(props: Partial<Parameters<typeof PlatformChangeForm>[0]> = {}) {
  const onSubmit = vi.fn()
  const onDirtyChange = vi.fn()
  render(
    <PlatformChangeForm
      stops={stops}
      stationIndex={indexStations(stations)}
      isPending={false}
      onSubmit={onSubmit}
      onDirtyChange={onDirtyChange}
      {...props}
    />,
  )
  return { onSubmit, onDirtyChange }
}

describe('PlatformChangeForm', () => {
  it('keeps the platform list disabled until a stop is chosen', async () => {
    const user = userEvent.setup()
    renderForm()

    expect(screen.getByLabelText('New platform')).toBeDisabled()

    await user.selectOptions(screen.getByLabelText('Stop whose platform changes'), 'Stop 2: Kandy')

    expect(screen.getByLabelText('New platform')).toBeEnabled()
  })

  it('lists only the platforms of the chosen stop station, in numeric order, and marks the current one', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.selectOptions(screen.getByLabelText('Stop whose platform changes'), 'Stop 2: Kandy')

    const options = screen.getByLabelText('New platform').querySelectorAll('option')
    expect(Array.from(options).map((option) => option.textContent)).toEqual([
      'Choose a platform',
      'Platform 2 (current)',
      'Platform 3',
      'Platform 10',
    ])
  })

  it('shows the platform error only after the user leaves the platform field with the current platform', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.selectOptions(screen.getByLabelText('Stop whose platform changes'), 'Stop 2: Kandy')
    await user.selectOptions(screen.getByLabelText('New platform'), 'Platform 2 (current)')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await user.tab()

    expect(screen.getByRole('alert')).toHaveTextContent('Choose a platform different from the current one.')
  })

  it('clears the chosen platform when the stop changes', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.selectOptions(screen.getByLabelText('Stop whose platform changes'), 'Stop 2: Kandy')
    await user.selectOptions(screen.getByLabelText('New platform'), 'Platform 3')
    await user.selectOptions(screen.getByLabelText('Stop whose platform changes'), 'Stop 3: Galle')

    expect(screen.getByLabelText('New platform')).toHaveValue('')
  })

  it('submits the stop and the new platform id once both are valid', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()

    await user.selectOptions(screen.getByLabelText('Stop whose platform changes'), 'Stop 2: Kandy')
    await user.selectOptions(screen.getByLabelText('New platform'), 'Platform 3')
    await user.click(screen.getByRole('button', { name: 'Review platform change' }))

    expect(onSubmit).toHaveBeenCalledWith({ sequence: 2, platformId: 'pl-kandy-3' })
  })

  it('says when a station has no platforms on record', async () => {
    const user = userEvent.setup()
    render(
      <PlatformChangeForm
        stops={[{ sequence: 1, stationId: 'st-empty', stationName: 'Empty', platformId: null, label: 'Stop 1: Empty' }]}
        stationIndex={indexStations([
          { id: 'st-empty', code: 'EMP', name: 'Empty', isInterchange: false, platforms: [], lines: [] },
        ])}
        isPending={false}
        onSubmit={vi.fn()}
      />,
    )

    await user.selectOptions(screen.getByLabelText('Stop whose platform changes'), 'Stop 1: Empty')

    expect(screen.getByText('No platforms are on record for this station.')).toBeInTheDocument()
  })
})
