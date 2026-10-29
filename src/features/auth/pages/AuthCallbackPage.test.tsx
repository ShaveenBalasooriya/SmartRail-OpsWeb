import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/app/providers/AuthContext'
import AuthCallbackPage from './AuthCallbackPage'

function renderPage(completeSignIn: AuthContextValue['completeSignIn']) {
  const value: AuthContextValue = {
    currentUser: null,
    isSignedIn: false,
    isLoading: false,
    signIn: vi.fn(),
    completeSignIn,
    logout: vi.fn(),
  }

  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={['/auth/callback']}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/board" element={<p>Board content</p>} />
          <Route path="/no-access" element={<p>No access content</p>} />
          <Route path="/login" element={<p>Sign-in page</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('AuthCallbackPage', () => {
  it('continues to the remembered path after a successful exchange', async () => {
    renderPage(vi.fn().mockResolvedValue({ returnTo: '/board', status: 'signed_in' }))

    expect(await screen.findByText('Board content')).toBeInTheDocument()
  })

  it('sends a signed-in role without access to the no-access screen, never the board', async () => {
    renderPage(vi.fn().mockResolvedValue({ returnTo: '/board', status: 'no_access' }))

    expect(await screen.findByText('No access content')).toBeInTheDocument()
  })

  it('sends a rejected token back to sign in, not to the no-access screen', async () => {
    renderPage(vi.fn().mockResolvedValue({ returnTo: '/board', status: 'signed_out' }))

    expect(await screen.findByText('Sign-in page')).toBeInTheDocument()
  })

  it('shows the failure with a way back to sign in', async () => {
    renderPage(vi.fn().mockRejectedValue(new Error('state not found')))

    expect(await screen.findByRole('heading', { name: 'Sign-in did not complete' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/login')
  })
})
