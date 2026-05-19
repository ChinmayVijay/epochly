import { useState } from 'react'
import styles from './SearchBar.module.css'

export default function SearchBar({ onSearch }) {
  const [value, setValue] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (value.trim()) onSearch(value.trim())
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        className={styles.input}
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="e.g. Space Race, Bitcoin, Nelson Mandela…"
        autoFocus
      />
      <button className={styles.btn} type="submit" disabled={!value.trim()}>
        Explore →
      </button>
    </form>
  )
}
