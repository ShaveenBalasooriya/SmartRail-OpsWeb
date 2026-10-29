import { useEffect, useId, useRef, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { X } from 'lucide-react'
import styles from './PublishDrawer.module.css'

type PublishDrawerProps = {
  title: string
  serviceName: string | null
  lineName: string | null
  // Closing is a navigation back to the journey, so the journey detail stays mounted underneath.
  onClose: () => void
  children: ReactNode
  // The design's sticky action row: a secondary Cancel and the primary review button. The review button
  // submits the drawer's own form through its form attribute.
  actions: ReactNode
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// The design's right-hand panel. It is a modal dialog over the journey detail, not a page of its own: the
// route is the panel's URL, the detail is the page behind it. Focus moves in on open, Tab is trapped, Escape
// and the backdrop close it, and focus returns to the trigger when the panel unmounts.
export default function PublishDrawer({
  title,
  serviceName,
  lineName,
  onClose,
  children,
  actions,
}: PublishDrawerProps) {
  const titleId = useId()
  const drawerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    drawerRef.current?.focus()

    return () => {
      triggerRef.current?.focus()
    }
  }, [])

  // The panel covers the page, so the page behind it must not scroll under the pointer.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
      return
    }

    if (event.key !== 'Tab' || !drawerRef.current) {
      return
    }

    const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (!first || !last) {
      return
    }

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  const service = [serviceName, lineName].filter((part): part is string => part !== null && part !== '')

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick}>
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={styles.drawer}
        onKeyDown={handleKeyDown}
      >
        <header className={styles.head}>
          <div>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            {service.length > 0 && <p className={styles.service}>{service.join(' · ')}</p>}
          </div>
          <button type="button" className={styles.close} aria-label="Close panel" onClick={onClose}>
            <X aria-hidden="true" size={18} />
          </button>
        </header>

        {children}

        <div className={styles.actions}>{actions}</div>
      </div>
    </div>
  )
}
