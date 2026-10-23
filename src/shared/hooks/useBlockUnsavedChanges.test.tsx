import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createMemoryRouter, RouterProvider, useNavigate } from 'react-router'
import { useBlockUnsavedChanges } from './useBlockUnsavedChanges'

// Save marks the submit before it navigates, the order the publish forms use. Leave is an ordinary
// navigation the blocker is expected to stop.
function FormPage({ isDirty }: { isDirty: boolean }) {
  const navigate = useNavigate()
  const { blocker, markSubmitted } = useBlockUnsavedChanges(isDirty)

  return (
    <>
      <h1>Form page</h1>
      <button type="button" onClick={() => navigate('/elsewhere')}>
        Leave
      </button>
      <button
        type="button"
        onClick={() => {
          markSubmitted()
          navigate('/saved')
        }}
      >
        Save
      </button>
      {blocker.state === 'blocked' && <p>Unsaved changes</p>}
    </>
  )
}

function renderFormAt(isDirty: boolean) {
  const router = createMemoryRouter(
    [
      { path: '/form', element: <FormPage isDirty={isDirty} /> },
      { path: '/elsewhere', element: <h1>Elsewhere</h1> },
      { path: '/saved', element: <h1>Saved</h1> },
    ],
    { initialEntries: ['/form'] },
  )

  render(<RouterProvider router={router} />)
}

describe('useBlockUnsavedChanges', () => {
  it('blocks leaving the page while the form is dirty', async () => {
    renderFormAt(true)

    await userEvent.click(screen.getByRole('button', { name: 'Leave' }))

    expect(await screen.findByText('Unsaved changes')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Form page' })).toBeInTheDocument()
  })

  it('lets the user leave a form that is not dirty', async () => {
    renderFormAt(false)

    await userEvent.click(screen.getByRole('button', { name: 'Leave' }))

    expect(await screen.findByRole('heading', { name: 'Elsewhere' })).toBeInTheDocument()
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
  })

  it('does not block the redirect after a successful save, even though the form is still dirty', async () => {
    renderFormAt(true)

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('heading', { name: 'Saved' })).toBeInTheDocument()
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
  })
})
