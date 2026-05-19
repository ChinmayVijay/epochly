import styles from './States.module.css'

export function EmptyState() {
  return (
    <div className={styles.center}>
      <div className={styles.icon}>◎</div>
      <p className={styles.label}>Pick a topic above to begin your journey through time.</p>
    </div>
  )
}

export function LoadingState({ topic }) {
  return (
    <div className={styles.center}>
      <div className={styles.spinner} aria-hidden="true" />
      <p className={styles.label}>
        Building timeline for <strong style={{ color: '#f0ede8' }}>{topic}</strong>…
      </p>
      <p className={styles.sub}>This takes about 5–10 seconds</p>
    </div>
  )
}

export function ErrorState({ message, onReset }) {
  return (
    <div className={styles.center}>
      <div className={`${styles.icon} ${styles.iconError}`}>✕</div>
      <p className={styles.label}>Something went wrong</p>
      <p className={styles.error}>{message}</p>
      <button className={styles.retryBtn} onClick={onReset}>← Try again</button>
    </div>
  )
}

export default EmptyState
