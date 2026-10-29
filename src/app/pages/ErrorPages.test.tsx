import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/app/providers/AuthContext'
import type { Role } from '@/features/auth/types'
import NoAccessPage from './NoAccessPage'
import ForbiddenPage from './ForbiddenPage'
import NotFoundPage from './NotFoundPage'
import RouteErrorPage from './RouteErrorPage'
import UnauthorizedPage from './UnauthorizedPage'

function authValue(role: Role): AuthContextValue {
  return {
    currentUser: { id: `staff-${role}`, displayName: 'controller.mahesh', role },
    isSignedIn: true,
    isLoading: false,
    signIn: vi.fn(),
    completeSignIn: vi.fn(),
    logout: vi.fn().mockResolvedValue(undefined),
  }
}

function renderForbidden(role: Role, path = '/journeys/j-1/publish/delay') {
  render(
    <AuthContext.Provider value={authValue(role)}>
      <MemoryRouter initialEntries={[path]}>
        <ForbiddenPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('ForbiddenPage', () => {
  it('shows the 403 card and sends an auditor to the audit log, not a board the API refuses them', () => {
    renderForbidden('auditor')

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('403')
    expect(screen.getByRole('heading', { name: "You don't have access to this page" })).toBeInTheDocument()
    expect(alert).toHaveTextContent('You are signed in as Auditor, which is read-only.')
    // The route guard never calls the API, so nothing is recorded here and the page must not claim it.
    expect(alert).not.toHaveTextContent('recorded in the audit log')
    expect(screen.getByRole('link', { name: 'View audit log' })).toHaveAttribute('href', '/audit')
    expect(screen.queryByRole('link', { name: 'Back to the live board' })).not.toBeInTheDocument()
  })

  it('gives a controller no audit link, because the audit log is auditor-only', () => {
    renderForbidden('network_controller', '/audit')

    expect(screen.getByRole('alert')).toHaveTextContent('You are signed in as Network Controller')
    expect(screen.getByRole('link', { name: 'Back to the live board' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'View audit log' })).not.toBeInTheDocument()
  })

  it('does not claim a denied map is a publish attempt', () => {
    renderForbidden('auditor', '/map')

    expect(screen.getByRole('alert')).toHaveTextContent('This page is available to another role.')
    expect(screen.queryByText(/Publishing, cancelling and correcting changes/)).not.toBeInTheDocument()
  })
})

function LoginProbe() {
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? ''

  return <p>{`from:${from}`}</p>
}

describe('UnauthorizedPage', () => {
  it('asks for sign-in and carries the attempted address to the sign-in page', async () => {
    render(
      <MemoryRouter initialEntries={['/journeys/j-1']}>
        <UnauthorizedPage />
        <Routes>
          <Route path="/login" element={<LoginProbe />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Sign in to continue' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('link', { name: 'Go to sign in' }))

    expect(screen.getByText('from:/journeys/j-1')).toBeInTheDocument()
  })
})

describe('NotFoundPage', () => {
  it('names the page and offers the live board', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to the live board' })).toHaveAttribute('href', '/board')
  })
})

describe('RouteErrorPage', () => {
  it('names the failure and offers a reload', () => {
    render(<RouteErrorPage />)

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument()
  })
})

describe('NoAccessPage', () => {
  it('uses the access card and signs the user out', async () => {
    const value = authValue('auditor')

    render(
      <AuthContext.Provider value={value}>
        <MemoryRouter>
          <NoAccessPage />
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(screen.getByRole('heading', { name: 'No access for this role' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(value.logout).toHaveBeenCalledTimes(1)
  })
})
