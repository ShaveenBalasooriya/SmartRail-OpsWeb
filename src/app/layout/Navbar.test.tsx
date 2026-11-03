import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '@/app/providers/AuthContext'
import type { Role } from '@/features/auth/types'
import { reportLiveStatus, resetLiveConnection } from '@/shared/live/liveConnectionStore'
import Navbar from './Navbar'

function renderNavbar(role: Role, initialEntry = '/board') {
  const logout = vi.fn().mockResolvedValue(undefined)
  const value: AuthContextValue = {
    currentUser: { id: `staff-${role}`, displayName: 'controller.mahesh', role },
    isSignedIn: true,
    isLoading: false,
    signIn: vi.fn(),
    completeSignIn: vi.fn(),
    logout,
  }
  const queryClient = new QueryClient()

  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={value}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Navbar />
          <Routes>
            <Route path="/login" element={<p>Sign-in page</p>} />
            <Route path="*" element={null} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )

  return { logout }
}

describe('Navbar', () => {
  afterEach(() => {
    resetLiveConnection()
  })

  it('offers a controller the live board and the network map, but not the audit log', () => {
    renderNavbar('network_controller')

    expect(screen.getByRole('link', { name: 'Live board' })).toHaveAttribute('href', '/board')
    expect(screen.getByRole('link', { name: 'Network map' })).toHaveAttribute('href', '/map')
    expect(screen.queryByRole('link', { name: 'Audit' })).not.toBeInTheDocument()
  })

  it('offers an auditor the audit log only, because the API refuses the board to them', () => {
    renderNavbar('auditor')

    expect(screen.getByRole('link', { name: 'Audit' })).toHaveAttribute('href', '/audit')
    expect(screen.queryByRole('link', { name: 'Live board' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Network map' })).not.toBeInTheDocument()
  })

  it('marks the current page and the home link', () => {
    renderNavbar('network_controller', '/board')

    expect(screen.getByRole('link', { name: 'Live board' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'SmartRail Operations home' })).toHaveAttribute('href', '/')
  })

  it('shows the connection, role, profile label and sign-out controls', () => {
    renderNavbar('network_controller')

    expect(screen.getByRole('status')).toHaveTextContent('Live')
    expect(screen.getByText('Network Controller')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'User profile: controller.mahesh' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reduce animations' })).toBeInTheDocument()
  })

  it('shows Degraded while the live stream is reconnecting', () => {
    reportLiveStatus('reconnecting')

    renderNavbar('network_controller')

    expect(screen.getByRole('status')).toHaveTextContent('Degraded')
  })

  it('shows Offline when the live stream closed after failing', () => {
    reportLiveStatus('reconnecting')
    reportLiveStatus('closed')

    renderNavbar('network_controller')

    expect(screen.getByRole('status')).toHaveTextContent('Offline')
  })

  it('reveals the signed-in user and role from the profile button', async () => {
    renderNavbar('auditor')

    await userEvent.click(screen.getByRole('button', { name: 'User profile: controller.mahesh' }))

    expect(screen.getByText('controller.mahesh')).toBeInTheDocument()
    // The role appears twice: the always-on badge and the open profile panel.
    expect(screen.getAllByText('Auditor')).toHaveLength(2)
  })

  it('signs out and returns to the sign-in page', async () => {
    const { logout } = renderNavbar('network_controller')

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(logout).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.getByText('Sign-in page')).toBeInTheDocument())
  })
})
