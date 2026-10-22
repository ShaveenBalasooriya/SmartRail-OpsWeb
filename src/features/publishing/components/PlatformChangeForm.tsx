import { useEffect, useState, type FormEvent } from 'react'
import Button from '@/shared/components/Button'
import FormField from '@/shared/ui/FormField'
import { platformsOf, type StationIndex } from '@/features/stations/lib/stationLookup'
import type { PlatformChangeInput } from '../types'
import type { StopOption } from '../lib/stopOptions'
import { validatePlatformChange } from '../lib/validateChange'
import styles from './PlatformChangeForm.module.css'

type PlatformChangeFormProps = {
  stops: StopOption[]
  stationIndex: StationIndex
  isPending: boolean
  onSubmit: (input: PlatformChangeInput) => void
  onDirtyChange?: (isDirty: boolean) => void
}

type PlatformField = 'sequence' | 'platformId'

// The platform list is the chosen stop's own station, so a platform of another station cannot be picked.
// The current platform is listed and marked, and validation refuses it.
export default function PlatformChangeForm({
  stops,
  stationIndex,
  isPending,
  onSubmit,
  onDirtyChange,
}: PlatformChangeFormProps) {
  const [sequence, setSequence] = useState<number | null>(null)
  const [platformId, setPlatformId] = useState('')
  const [touched, setTouched] = useState<Partial<Record<PlatformField, boolean>>>({})
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)

  const isDirty = sequence !== null || platformId !== ''
  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  const selectedStop = stops.find((stop) => stop.sequence === sequence) ?? null
  const currentPlatformId = selectedStop?.platformId ?? null
  const platforms = selectedStop ? (platformsOf(stationIndex, selectedStop.stationId) ?? []) : []

  const errors = validatePlatformChange({ sequence, platformId, currentPlatformId })
  const isValid = errors.sequence === null && errors.platformId === null

  function shownError(field: PlatformField): string | null {
    return touched[field] || attemptedSubmit ? errors[field] : null
  }

  function touch(field: PlatformField) {
    setTouched((current) => ({ ...current, [field]: true }))
  }

  // Changing the stop clears the platform, because the list it was picked from belongs to the old stop.
  function handleStopChange(value: string) {
    setSequence(value === '' ? null : Number(value))
    setPlatformId('')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAttemptedSubmit(true)

    if (sequence === null || !isValid) {
      return
    }
    onSubmit({ sequence, platformId: platformId.trim() })
  }

  const noPlatformsHint =
    selectedStop !== null && platforms.length === 0 ? 'No platforms are on record for this station.' : undefined

  return (
    <form noValidate className={styles.form} onSubmit={handleSubmit}>
      <FormField id="platform-stop" label="Stop whose platform changes" error={shownError('sequence')}>
        {(a11y) => (
          <select
            {...a11y}
            className={styles.control}
            value={sequence === null ? '' : String(sequence)}
            onChange={(event) => handleStopChange(event.target.value)}
            onBlur={() => touch('sequence')}
          >
            <option value="">Choose a stop</option>
            {stops.map((stop) => (
              <option key={stop.sequence} value={stop.sequence}>
                {stop.label}
              </option>
            ))}
          </select>
        )}
      </FormField>

      <FormField
        id="platform-new"
        label="New platform"
        hint={noPlatformsHint}
        error={shownError('platformId')}
      >
        {(a11y) => (
          <select
            {...a11y}
            className={styles.control}
            value={platformId}
            disabled={selectedStop === null}
            onChange={(event) => setPlatformId(event.target.value)}
            onBlur={() => touch('platformId')}
          >
            <option value="">{selectedStop === null ? 'Choose a stop first' : 'Choose a platform'}</option>
            {platforms.map((platform) => (
              <option key={platform.id} value={platform.id}>
                {platform.id === currentPlatformId
                  ? `Platform ${platform.number} (current)`
                  : `Platform ${platform.number}`}
              </option>
            ))}
          </select>
        )}
      </FormField>

      <div className={styles.actions}>
        <Button type="submit" disabled={!isValid || isPending}>
          {isPending ? 'Publishing…' : 'Review platform change'}
        </Button>
      </div>
    </form>
  )
}
