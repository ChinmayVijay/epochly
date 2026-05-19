import { useState, useRef, useEffect } from 'react'
import styles from './SearchBar.module.css'
import { useSuggestions } from '../hooks/useSuggestions.js'

export default function SearchBar({ onSearch }) {
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  const { 
    staticSuggestions, 
    aiSuggestions, 
    aiLoading 
  } = useSuggestions(value)

  const allSuggestions = [
    ...staticSuggestions.map(s => ({
      label: s.label,
      count: `${s.eventCount} events`,
      type: 'static'
    })),
    ...aiSuggestions.map(s => ({
      label: s,
      count: 'AI generated',
      type: 'ai'
    }))
  ]

  useEffect(() => {
    const trimmed = value.trim()
    setOpen(trimmed.length >= 1)
    setHighlighted(-1)
  }, [value, staticSuggestions, aiSuggestions])

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
    if (
      highlighted >= 0 &&
      allSuggestions[highlighted]
    ) {
      selectSuggestion(
        allSuggestions[highlighted].label
      )
    } else if (value.trim()) {
      submit(value.trim())
    }
  }

  function selectSuggestion(label) {
    setValue('')
    setOpen(false)
    setHighlighted(-1)
    onSearch(label)
  }

  function submit(topic) {
    setValue('')
    setOpen(false)
    onSearch(topic)
  }

  function handleKeyDown(e) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted(h =>
        h < allSuggestions.length - 1 ? h + 1 : 0
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted(h =>
        h > 0 ? h - 1 : allSuggestions.length - 1
      )
    } else if (e.key === 'Escape') {
      setOpen(false)
      setHighlighted(-1)
    }
  }

  function highlight(text, query) {
    if (!query || !query.trim()) return text
    const idx = text.toLowerCase()
      .indexOf(query.toLowerCase().trim())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{
          background: 'var(--accent-dim)',
          color: 'var(--accent)',
          borderRadius: '2px',
          padding: '0 1px',
          fontWeight: 500
        }}>
          {text.slice(idx, idx + query.trim().length)}
        </mark>
        {text.slice(idx + query.trim().length)}
      </>
    )
  }

  const showDropdown = open && value.trim().length >= 1

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
            if (value.trim().length >= 1) setOpen(true)
          }}
          placeholder="Search any topic in history…"
          autoComplete="off"
          autoFocus
          aria-label="Search any historical topic"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
        />
        <button
          className={styles.btn}
          type="submit"
          disabled={!value.trim()}
        >
          Explore →
        </button>
      </form>

      {showDropdown && (
        <div
          className={styles.dropdown}
          role="listbox"
        >
          <div className={styles.dropdownInner}>

            {allSuggestions.length > 0 && (
              allSuggestions.map((s, i) => (
                <div
                  key={`${s.label}-${i}`}
                  role="option"
                  aria-selected={i === highlighted}
                  className={[
                    styles.suggestion,
                    i === highlighted
                      ? styles.suggestionActive
                      : ''
                  ].join(' ')}
                  onMouseDown={() =>
                    selectSuggestion(s.label)
                  }
                  onMouseEnter={() =>
                    setHighlighted(i)
                  }
                >
                  <div className={styles.suggestionLeft}>
                    <i
                      className={
                        s.type === 'ai'
                          ? 'ti ti-sparkles'
                          : 'ti ti-timeline'
                      }
                      style={{
                        fontSize: '13px',
                        color: s.type === 'ai'
                          ? 'var(--accent)'
                          : 'var(--text-muted)'
                      }}
                      aria-hidden="true"
                    />
                    <span
                      className={styles.suggestionLabel}
                    >
                      {highlight(s.label, value)}
                    </span>
                  </div>
                  <span
                    className={[
                      styles.suggestionCount,
                      s.type === 'ai'
                        ? styles.aiTag
                        : ''
                    ].join(' ')}
                  >
                    {s.count}
                  </span>
                </div>
              ))
            )}

            {aiLoading && (
              <div className={styles.aiLoadingRow}>
                <div className={styles.aiDots}>
                  <span /><span /><span />
                </div>
                Finding more topics…
              </div>
            )}

            <div className={styles.dropdownFooter}>
              <i
                className="ti ti-arrow-back"
                style={{ fontSize: '11px' }}
                aria-hidden="true"
              />
              Press Enter to explore
              <strong style={{ color: 'var(--text)' }}>
                {value.trim()
                  ? ` "${value.trim()}"` 
                  : ' any topic'}
              </strong>
              with AI
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
