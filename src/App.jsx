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

const GROQ_BODY = (topic) => ({
  model: 'llama-3.1-8b-instant',
  temperature: 0.7,
  max_tokens: 2500,
  messages: [
    {
      role: 'system',
      content: 'You are a world-class historical narrative writer. Your timelines are read by curious intelligent adults who want to understand how the world got to where it is today. You write with clarity, authority, and just enough drama to make history feel alive. Always respond with ONLY a valid JSON object. No markdown, no code fences, no preamble, no explanation. Ever.'
    },
    {
      role: 'user',
      content: `Generate a timeline for: ${topic}\nFIELD QUALITY GUIDE:\n- topic: clean display name\n- intro: 2-3 sentences. Hook the reader, give context, set up the tension. Write like a magazine opening paragraph.\n- events.title: active verb headline max 8 words. GOOD: "Germany invades Poland without warning" BAD: "The invasion of Poland"\n- events.summary: one punchy sentence a 16-year-old understands. State what happened AND why it mattered. Max 20 words.\n- events.detail: exactly 2-3 sentences. Sentence 1 what happened. Sentence 2 why it happened. Sentence 3 what changed. Never start with "The".\n- events.subEvents: exactly 5 per event. Each is a distinct moment zooming into that period. Title must have a verb. Desc must include a specific name, number, or place.\n- outro.summary: 2-3 sentences on legacy including one genuinely surprising specific fact. No generalities.\n- outro.question: one lingering question about the nature of what happened. Do not start with "What if". End with ... not a question mark.\n- related: 3 thematically connected topic names.\nEXAMPLE HIGH QUALITY EVENT:\n{"date":"Jun 1944","title":"Allied forces storm Normandy beaches","summary":"150,000 troops land on five French beaches, opening the front that ends Nazi occupation of Western Europe.","detail":"Operation Overlord was the largest seaborne invasion in history. Despite catastrophic losses at Omaha Beach where 2,000 Americans fell in hours, Allied forces secured a foothold by nightfall. It marked the beginning of the end for Hitler's empire in the West.","type":"war","subEvents":[{"date":"Jun 5, 1944","title":"Eisenhower gives the order","desc":"Despite poor weather, Eisenhower tells 150,000 troops they go tomorrow."},{"date":"Jun 6, 1944","title":"Paratroopers drop behind enemy lines","desc":"13,000 American paratroopers land in darkness to cut off German reinforcements inland."},{"date":"Jun 6, 1944","title":"Five beaches stormed at dawn","desc":"Allied divisions hit Utah, Omaha, Gold, Juno and Sword simultaneously at 06:30."},{"date":"Jun 7, 1944","title":"Beachhead secured despite heavy losses","desc":"Over 10,000 Allied casualties but all five beaches held by end of day one."},{"date":"Jun 25, 1944","title":"Cherbourg falls to US forces","desc":"First major French port captured giving Allies a critical supply route for troops inland."}]}\nReturn ONLY this JSON. First character { last character } nothing else:\n{"topic":"string","intro":"string","events":[{"date":"string","title":"string","summary":"string","detail":"string","type":"political|war|culture|science|economy|other","subEvents":[{"date":"string","title":"string","desc":"string"},{"date":"string","title":"string","desc":"string"},{"date":"string","title":"string","desc":"string"},{"date":"string","title":"string","desc":"string"},{"date":"string","title":"string","desc":"string"}]}],"outro":{"summary":"string","question":"string"},"related":["string","string","string"],"ongoing":false}\nOUTPUT RULES:\n- Exactly 10 main events chronological\n- Exactly 5 subEvents per main event\n- ongoing true only if actively unfolding in 2025\n- Every string valid JSON safe, no unescaped quotes, no line breaks inside strings\n- First character of response must be {\n- Last character must be }\n- Nothing before or after`
    }
  ]
})

async function groqFetch(body) {
  const res = await fetch(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify(body)
    }
  )

  if (res.status === 429) {
    // Extract wait time from Groq's error message, e.g. "try again in 3.94s"
    const err = await res.json().catch(() => ({}))
    const match = err?.error?.message?.match(
      /try again in ([\d.]+)s/i
    )
    const waitMs = match
      ? Math.ceil(parseFloat(match[1]) * 1000) + 500
      : parseInt(res.headers.get('retry-after') || '10') * 1000
    await new Promise(r => setTimeout(r, waitMs))
    // Retry once after waiting
    return groqFetch(body)
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(
      err?.error?.message || `API error ${res.status}`
    )
  }

  return res
}

async function fetchTimeline(topic) {
  const res = await groqFetch(GROQ_BODY(topic))


  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content || ''

  function repairJSON(str) {
    let cleaned = str
      .replace(/```json|```/g, '')
      .trim()
    try {
      return JSON.parse(cleaned)
    } catch {
      // Each event with subEvents ends with one of two patterns:
      //   }]},  → lastSubEvent} subEvents] event} separator,
      //   }]}]  → lastSubEvent} subEvents] event} eventsArray]  (last event)
      // Find the rightmost valid cut-point and close the JSON from there.
      const idxFinal = cleaned.lastIndexOf('}]}]')
      const idxSep   = cleaned.lastIndexOf('}]},')

      let partial

      if (idxFinal !== -1 && idxFinal >= idxSep) {
        // All events complete; truncation is in outro or later.
        // Slice through the events-array closing ].
        partial = cleaned.slice(0, idxFinal + 4)
      } else if (idxSep !== -1) {
        // At least one complete non-final event found.
        // idxSep+2 is the event-closing }; append ] to close the events array.
        partial = cleaned.slice(0, idxSep + 3) + ']'
      } else {
        throw new Error(
          'Could not generate timeline. Please try again.'
        )
      }

      if (!partial.includes('"outro"')) {
        partial +=
          ',"outro":{"summary":"","question":"..."}' +
          ',"related":[],"ongoing":false}'
      } else {
        partial += '}'
      }

      if (!partial.includes('"intro"')) {
        const eventsIndex = partial.indexOf('"events"')
        if (eventsIndex !== -1) {
          partial = '{"topic":"","intro":"",' +
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