import { useId, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router'
import { CircleUserRound, LogOut, Moon, Sun, Zap } from 'lucide-react'
import { useAuth, useCurrentUser } from '@/app/providers/AuthContext'
import { ROLE_LABELS, type Role } from '@/features/auth/types'
import { useConnectionStatus } from '@/shared/hooks/useConnectionStatus'
import {
  applyMotion,
  applyTheme,
  resolveInitialMotion,
  resolveInitialTheme,
  storeMotion,
  storeTheme,
  type Motion,
  type Theme,
} from '@/shared/preferences/appearance'
import styles from './Navbar.module.css'

type NavItem = {
  to: string
  label: string
  roles: Role[]
}

// Links are filtered by role here. The route guards still enforce access; this only decides what is offered.
// The API refuses an auditor on /operations/journeys (403), so the board is not offered to them until the
// backend allows that read; the route and its forbidden page stay in place.
const NAV_ITEMS: NavItem[] = [
  { to: '/board', label: 'Live board', roles: ['network_controller'] },
  { to: '/map', label: 'Network map', roles: ['network_controller'] },
  { to: '/audit', label: 'Audit', roles: ['auditor'] },
]

const CONNECTION_LABELS = {
  live: 'Live',
  connecting: 'Connecting',
  degraded: 'Degraded',
  offline: 'Offline',
} as const

// Mounted only beneath RequireAuth, so the user is never null here.
export default function Navbar() {
  const navigate = useNavigate()
  const currentUser = useCurrentUser()
  const { logout } = useAuth()
  const connection = useConnectionStatus()
  const [theme, setTheme] = useState<Theme>(resolveInitialTheme)
  const [motion, setMotion] = useState<Motion>(resolveInitialMotion)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const profilePanelId = useId()

  const isDark = theme === 'dark'
  // One string feeds both aria-label and title so the accessible name and the tooltip cannot drift.
  // The toggle is not aria-pressed: its label already names the action, and a pressed state would announce the opposite.
  const themeLabel = isDark ? 'Switch to light mode' : 'Switch to dark mode'
  const isReduced = motion === 'reduced'
  const motionLabel = isReduced ? 'Animations reduced. Turn animations back on' : 'Reduce animations'
  const profileLabel = `User profile: ${currentUser.displayName}`

  function toggleTheme() {
    const next: Theme = isDark ? 'light' : 'dark'
    storeTheme(next)
    applyTheme(next)
    setTheme(next)
  }

  function toggleMotion() {
    const next: Motion = isReduced ? 'full' : 'reduced'
    storeMotion(next)
    applyMotion(next)
    setMotion(next)
  }

  // Navigate first so the sign-in page replaces the current page at once, rather than flashing the
  // "sign in to continue" page while the session is cleared. logout clears local identity even on failure.
  function handleSignOut() {
    navigate('/login', { replace: true })
    void logout().catch(() => undefined)
  }

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(currentUser.role))

  return (
    <header className={styles.navbar}>
      <Link to="/" className={styles.brand} aria-label="SmartRail Operations home">
        <span className={styles.mark} aria-hidden="true">
          <Zap size={18} />
        </span>
        <span>SmartRail Operations</span>
      </Link>

      <nav aria-label="Main" className={styles.nav}>
        <ul className={styles.links}>
          {visibleItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles.controls}>
        <span className={`${styles.connection} ${styles[connection]}`} role="status">
          <span className={styles.connectionDot} aria-hidden="true" />
          {CONNECTION_LABELS[connection]}
        </span>

        <button
          type="button"
          className={styles.iconButton}
          onClick={toggleTheme}
          aria-label={themeLabel}
          title={themeLabel}
        >
          {isDark ? <Sun aria-hidden="true" size={18} /> : <Moon aria-hidden="true" size={18} />}
        </button>

        <button
          type="button"
          className={`${styles.iconButton} ${isReduced ? styles.on : ''}`}
          onClick={toggleMotion}
          aria-pressed={isReduced}
          aria-label={motionLabel}
          title={motionLabel}
        >
          <Zap aria-hidden="true" size={18} />
        </button>

        <span className={styles.role}>{ROLE_LABELS[currentUser.role]}</span>

        <div
          className={styles.profile}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setIsProfileOpen(false)
            }
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setIsProfileOpen(false)
            }
          }}
        >
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => setIsProfileOpen((isOpen) => !isOpen)}
            aria-label={profileLabel}
            aria-expanded={isProfileOpen}
            aria-controls={profilePanelId}
            title={profileLabel}
          >
            <CircleUserRound aria-hidden="true" size={18} />
          </button>
          {isProfileOpen && (
            <div id={profilePanelId} className={styles.profilePanel}>
              <span className={styles.profileName}>{currentUser.displayName}</span>
              <span className={styles.profileRole}>{ROLE_LABELS[currentUser.role]}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          className={`${styles.iconButton} ${styles.signOut}`}
          onClick={handleSignOut}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut aria-hidden="true" size={18} />
        </button>
      </div>
    </header>
  )
}
