import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, 
  useParams, Navigate } from 'react-router-dom'
import styles from './App.module.css'
import SearchBar from './components/SearchBar.jsx'
import TopicPills from './components/TopicPills.jsx'
import Timeline from './components/Timeline.jsx'
import EmptyState from './components/EmptyState.jsx'
import ErrorState from './components/ErrorState.jsx'
import LoadingState from './components/LoadingState.jsx'
import Logo from './components/Logo.jsx'
import { useTheme } from './hooks/useTheme.js'
import { PRESET_TOPICS, findTimeline } from './data.js'

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY

function toSlug(topic) {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function fromSlug(slug) {
  return slug.replace(/-/g, ' ')
}

async function fetchTimeline(topic) {
  const res = await fetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        temperature: 0.7,
        max_tokens: 2500,
        messages: 
        [
          {
            role: 'system',
            content: `You are a historical research 
assistant. You always respond with ONLY a valid 
JSON object. No markdown, no code fences, no 
explanation before or after the JSON. Never add 
any text outside the JSON object.`
          },
          {
            role: 'user',
            content: `Generate a timeline for: ${topic}

Return ONLY this JSON structure, nothing else:
{
  "topic": "display name for the topic",
  "intro": "2-3 sentence editorial introduction",
  "events": [
    {
      "date": "Month Year or Year",
      "title": "Short title max 8 words",
      "summary": "One clear sentence max 20 words",
      "detail": "2-3 sentences of deeper context",
      "type": "political|war|culture|science|economy|other",
      "subEvents": [
        {
          "date": "Month Year or Year",
          "title": "Short title max 6 words",
          "desc": "One short sentence max 12 words"
        }
      ]
    }
  ],
  "outro": {
    "summary": "2-3 sentences on lasting impact with surprising fact",
    "question": "Thought provoking question ending with question mark"
  },
  "related": [],
  "ongoing": false
}

Critical Rules:
- Return exactly 10 events chronologically
- Keep each field short and concise
- For each main event generate 5 subEvents
- SubEvents are in chronological order
- ALL strings must be valid JSON
- Set ongoing to true if topic is still unfolding
- Return ONLY valid JSON nothing else
- No markdown backticks or explanation`
          }
        ]
      })
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      err?.error?.message || `API error ${res.status}`
    )
  }

  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content || ''

  function repairJSON(str) {
    let cleaned = str
      .replace(/```json|```/g, '')
      .trim()
    try {
      return JSON.parse(cleaned)
    } catch {
      const lastBrace = cleaned.lastIndexOf('},')
      if (lastBrace === -1) {
        throw new Error(
          'Could not generate timeline. Please try again.'
        )
      }
      let partial = cleaned.slice(0, lastBrace + 1) + ']}'
      if (!partial.includes('"outro"')) {
        partial = partial.replace(
          ']}',
          `],"outro":{"summary":"","question":"..."},` +
          `"related":[],"ongoing":false}}`
        )
      }
      if (!partial.includes('"intro"')) {
        const eventsIndex = partial.indexOf('"events"')
        if (eventsIndex !== -1) {
          partial = `{"topic":"","intro":"",` +
            partial.slice(eventsIndex)
        }
      }
      try {
        return JSON.parse(partial)
      } catch {
        throw new Error(
          'Could not generate timeline. Please try again.'
        )
      }
    }
  }

  return repairJSON(raw)
}

function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      className={styles.themeToggle}
      onClick={toggle}
      aria-label="Toggle dark and light mode"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}

function HomeView() {
  const navigate = useNavigate()

  function handleSearch(topic) {
    if (!topic.trim()) return
    navigate(`/timeline/${toSlug(topic)}`)
  }

  return (
    <div className={styles.app}>
      <header className={styles.hero}>
        <div className={styles.navRow}>
          <div className={styles.logoWrap}>
            <Logo size={34} />
            <h1 className={styles.logo}>
              <span className={styles.logoMain}>
                Epochly
              </span>
              <span className={styles.logoAi}>
                .ai
              </span>
            </h1>
          </div>
          <ThemeToggle />
        </div>
        <p className={styles.tagline}>
          Type any topic. See its story unfold.
        </p>
        <SearchBar onSearch={handleSearch} />
        <TopicPills
          topics={PRESET_TOPICS}
          onSelect={handleSearch}
        />
      </header>
      <main className={styles.main}>
        <EmptyState />
      </main>
    </div>
  )
}

function TimelineView() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading')
  const [timeline, setTimeline] = useState(null)
  const [error, setError] = useState('')

  const topic = fromSlug(slug)

  useEffect(() => {
    setStatus('loading')
    setTimeline(null)
    setError('')

    const staticResult = findTimeline(topic)
    if (staticResult) {
      setTimeline(staticResult)
      setStatus('success')
      return
    }

    fetchTimeline(topic)
      .then(data => {
        setTimeline(data)
        setStatus('success')
      })
      .catch(err => {
        setError(err.message)
        setStatus('error')
      })
  }, [slug])

  function handleSearch(newTopic) {
    if (!newTopic.trim()) return
    navigate(`/timeline/${toSlug(newTopic)}`)
  }

  return (
    <div className={styles.app}>
      <header className={styles.hero}>
        <div className={styles.navRow}>
          <div
            className={styles.logoWrap}
            onClick={() => navigate('/')}
            style={{ cursor: 'pointer' }}
          >
            <Logo size={34} />
            <h1 className={styles.logo}>
              <span className={styles.logoMain}>
                Epochly
              </span>
              <span className={styles.logoAi}>
                .ai
              </span>
            </h1>
          </div>
          <ThemeToggle />
        </div>
        <SearchBar onSearch={handleSearch} />
      </header>
      <main className={styles.main}>
        {status === 'loading' && (
          <LoadingState topic={topic} />
        )}
        {status === 'error' && (
          <ErrorState
            message={error}
            onReset={() => navigate('/')}
          />
        )}
        {status === 'success' && timeline && (
          <Timeline
            data={timeline}
            onReset={() => navigate('/')}
          />
        )}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeView />} />
      <Route
        path="/timeline/:slug"
        element={<TimelineView />}
      />
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  )
}