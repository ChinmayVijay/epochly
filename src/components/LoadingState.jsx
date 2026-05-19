import styles from './States.module.css'

export default function LoadingState({ topic }) {
  return (
    <div className={styles.center}>
      <div className={styles.spinner} />
      <p className={styles.label}>
        Building timeline for{' '}
        <strong style={{ color: 'var(--text)' }}>
          {topic}
        </strong>
        …
      </p>
      <p className={styles.sub}>
        This takes about 5–10 seconds
      </p>
    </div>
  )
}
