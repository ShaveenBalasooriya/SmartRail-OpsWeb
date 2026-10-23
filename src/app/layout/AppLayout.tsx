import { Outlet } from 'react-router'
import Footer from './Footer'
import Navbar from './Navbar'
import styles from './AppLayout.module.css'

// Every authenticated page inherits the navbar and footer through this route, not by wrapping each page.
export default function AppLayout() {
  return (
    <div className={styles.shell}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>
      <Navbar />
      <main id="main-content" className={styles.main}>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
