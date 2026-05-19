import { useState, useRef, useEffect } from 'react'
import styles from './SearchBar.module.css'
import { searchTopics } from '../data.js'

export default function SearchBar({ onSearch }) {
  const [value, setValue] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (value.trim().length >= 2) {
      const results = searchTopics(value)
      setSuggestions(results)
      setOpen(results.length > 0)
      setHighlighted(-1)
    } else {
      setSuggestions([])
      setOpen(false)
    }
  }, [value])

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && 
        !wrapRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener(
      'mousedown', handleClickOutside
    )
    return () => document.removeEventListener(
      'mousedown', handleClickOutside
    )
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    if (highlighted >= 0 && suggestions[highlighted]) {
      selectSuggestion(suggestions[highlighted].label)
    } else if (value.trim()) {
      submit(value.trim())
    }
  }

  function selectSuggestion(label) {
    setValue(label)
    setOpen(false)
    setHighlighted(-1)
    submit(label)
  }

  function submit(topic) {
    onSearch(topic)
    setValue('')
    setOpen(false)
  }

  function handleKeyDown(e) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted(h =>
        h < suggestions.length - 1 ? h + 1 : 0
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted(h =>
        h > 0 ? h - 1 : suggestions.length - 1
      )
    } else if (e.key === 'Escape') {
      setOpen(false)
      setHighlighted(-1)
    }
  }

  function highlight(text, query) {
    const idx = text.toLowerCase()
      .indexOf(query.toLowerCase())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{
          background: 'var(--accent-dim)',
          color: 'var(--accent)',
          borderRadius: '2px',
          padding: '0 1px'
        }}>
          {text.slice(idx, idx + query.length)}
        </mark>
        {text.slice(idx + query.length)}
      </>
    )
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <form
        className={styles.form}
        onSubmit={handleSubmit}
      >
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true)
          }}
          placeholder="e.g. Space Race, Bitcoin, 
            Nelson Mandela…"
          autoComplete="off"
          autoFocus
        />
        <button
          className={styles.btn}
          type="submit"
          disabled={!value.trim()}
        >
          Explore →
        </button>
      </form>

      {open && suggestions.length > 0 && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownInner}>
            {suggestions.map((s, i) => (
              <div
                key={s.key}
                className={
                  `${styles.suggestion} ` +
                  (i === highlighted
                    ? styles.suggestionActive
                    : '')
                }
                onMouseDown={() =>
                  selectSuggestion(s.label)
                }
                onMouseEnter={() => setHighlighted(i)}
              >
                <div className={styles.suggestionLeft}>
                  <i
                    className="ti ti-timeline"
                    style={{ fontSize: '13px' }}
                    aria-hidden="true"
                  />
                  <span className={styles.suggestionLabel}>
                    {highlight(s.label, value)}
                  </span>
                </div>
                <span className={styles.suggestionCount}>
                  {s.eventCount} events
                </span>
              </div>
            ))}
            <div className={styles.dropdownFooter}>
              <i
                className="ti ti-sparkles"
                style={{ fontSize: '11px' }}
                aria-hidden="true"
              />
              Press Enter to search any topic with AI
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
