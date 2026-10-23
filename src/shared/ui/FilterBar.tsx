import type { ReactNode } from 'react'
import styles from './FilterBar.module.css'

type FilterBarProps = {
  children: ReactNode
}

// Layout only: the controls it holds are domain components. It sticks to the top while the list
// scrolls, so the filters stay in reach.
export default function FilterBar({ children }: FilterBarProps) {
  return <div className={styles.filterBar}>{children}</div>
}
