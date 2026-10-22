import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/app/providers/AuthContext'
import type { Role } from '@/features/auth/types'
import RequireRole from './RequireRole'

function renderAt(role: Role) {
  const value: AuthContextValue = {
    currentUser: { id: `dev-${role}`, displayName: 'Test user', role },
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }

  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={['/audit']}>
        <Routes>
          <Route element={<RequireRole allowedRoles={['auditor']} />}>
            <Route path="/audit" element={<p>Audit content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('RequireRole', () => {
  it('renders the forbidden state in place when the role is not allowed', () => {
    renderAt('network_controller')

    expect(screen.getByRole('heading', { name: 'You do not have access to this page' })).toBeInTheDocument()
    expect(screen.queryByText('Audit content')).not.toBeInTheDocument()
  })

  it('renders the child route when the role is allowed', () => {
    renderAt('auditor')

    expect(screen.getByText('Audit content')).toBeInTheDocument()
  })
})
