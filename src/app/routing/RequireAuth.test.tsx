import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/app/providers/AuthContext'
import RequireAuth from './RequireAuth'

function renderAt(overrides: Partial<AuthContextValue>) {
  const value: AuthContextValue = {
    currentUser: null,
    isSignedIn: false,
    isLoading: false,
    signIn: vi.fn(),
    completeSignIn: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  }

  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={['/board']}>
        <Routes>
          <Route path="/no-access" element={<p>No access screen</p>} />
          <Route element={<RequireAuth />}>
            <Route path="/board" element={<p>Board content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('RequireAuth', () => {
  it('shows a loading state while the session is restored', () => {
    renderAt({ isLoading: true })

    expect(screen.getByRole('status')).toHaveTextContent('Loading')
  })

  it('asks a signed-out visitor to sign in at the attempted address', () => {
    renderAt({})

    expect(screen.getByRole('heading', { name: 'Sign in to continue' })).toBeInTheDocument()
    expect(screen.queryByText('Board content')).not.toBeInTheDocument()
  })

  it('sends a signed-in role without access to the no-access screen, not the board', () => {
    renderAt({ isSignedIn: true })

    expect(screen.getByText('No access screen')).toBeInTheDocument()
    expect(screen.queryByText('Board content')).not.toBeInTheDocument()
  })

  it('renders the protected route for a signed-in staff user', () => {
    renderAt({
      currentUser: { id: 'staff-1', displayName: 'controller.mahesh', role: 'network_controller' },
      isSignedIn: true,
    })

    expect(screen.getByText('Board content')).toBeInTheDocument()
  })
})
