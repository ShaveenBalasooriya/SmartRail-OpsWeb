import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/app/providers/AuthContext'
import type { Role } from '@/features/auth/types'
import RequireAuth from '@/app/routing/RequireAuth'
import RoleHome from './RoleHome'

function authValue(overrides: Partial<AuthContextValue>): AuthContextValue {
  return {
    currentUser: null,
    isSignedIn: false,
    isLoading: false,
    signIn: vi.fn(),
    completeSignIn: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  }
}

function renderHome(role: Role) {
  const value = authValue({
    currentUser: { id: `staff-${role}`, displayName: 'Test user', role },
    isSignedIn: true,
  })

  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<RoleHome />} />
          <Route path="/board" element={<p>Board content</p>} />
          <Route path="/audit" element={<p>Audit content</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('RoleHome', () => {
  it('sends a network controller to the live board', () => {
    renderHome('network_controller')

    expect(screen.getByText('Board content')).toBeInTheDocument()
    expect(screen.queryByText('Audit content')).not.toBeInTheDocument()
  })

  it('sends an auditor to the audit log, because the API refuses them the board', () => {
    renderHome('auditor')

    expect(screen.getByText('Audit content')).toBeInTheDocument()
    expect(screen.queryByText('Board content')).not.toBeInTheDocument()
  })

  // The route sits beneath RequireAuth, so a guard never reaches RoleHome: the guard still sends them
  // to the existing no-access screen instead of a role page they cannot open.
  it('keeps the no-access behaviour for a guard through RequireAuth', () => {
    render(
      <AuthContext.Provider value={authValue({ isSignedIn: true })}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/no-access" element={<p>No access screen</p>} />
            <Route element={<RequireAuth />}>
              <Route path="/" element={<RoleHome />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(screen.getByText('No access screen')).toBeInTheDocument()
  })
})
