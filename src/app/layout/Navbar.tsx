import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router'
import { LogOut, Moon, Sun, Zap, ZapOff } from 'lucide-react'
import { useAuth, useCurrentUser } from '@/app/providers/AuthContext'
import { ROLE_LABELS, type Role } from '@/features/auth/types'
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
const NAV_ITEMS: NavItem[] = [
  { to: '/board', label: 'Live board', roles: ['network_controller', 'auditor'] },
  { to: '/audit', label: 'Audit', roles: ['auditor'] },
]

// Mounted only beneath RequireAuth, so the user is never null here.
export default function Navbar() {
  const navigate = useNavigate()
  const currentUser = useCurrentUser()
  const { logout } = useAuth()
  const [theme, setTheme] = useState<Theme>(resolveInitialTheme)
  const [motion, setMotion] = useState<Motion>(resolveInitialMotion)

  const isDark = theme === 'dark'
  // One string feeds both aria-label and title so the accessible name and the tooltip cannot drift.
  // The toggle is not aria-pressed: its label already names the action, and a pressed state would announce the opposite.
  const themeLabel = isDark ? 'Switch to light mode' : 'Switch to dark mode'
  const isReduced = motion === 'reduced'
  const motionLabel = isReduced ? 'Turn on animations' : 'Reduce animations'

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
      <div className={styles.brand}>SmartRail Operations</div>

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
          className={styles.iconButton}
          onClick={toggleMotion}
          aria-label={motionLabel}
          title={motionLabel}
        >
          {isReduced ? <ZapOff aria-hidden="true" size={18} /> : <Zap aria-hidden="true" size={18} />}
        </button>

        <span className={styles.identity}>
          <span className={styles.name}>{currentUser.displayName}</span>
          <span className={styles.role}>{ROLE_LABELS[currentUser.role]}</span>
        </span>

        <button type="button" className={styles.signOut} onClick={handleSignOut}>
          <LogOut aria-hidden="true" size={18} />
          <span>Sign out</span>
        </button>
      </div>
    </header>
  )
}
