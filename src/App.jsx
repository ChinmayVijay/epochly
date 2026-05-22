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

Before writing, think about:
- What is the single most important thread that 
  runs through this topic's entire history?
- Which 10 events best reveal that thread to 
  someone who knows nothing about this topic?
- What surprising or counterintuitive fact would 
  make a reader stop and think?

FIELD QUALITY GUIDE — read before writing:

topic: Clean display name for the topic.

intro: 2-3 sentences. Job 1 — hook the reader 
with what makes this topic uniquely important or 
surprising. Job 2 — give essential context a 
newcomer needs. Job 3 — set up the tension the 
timeline will answer. Write like the opening 
paragraph of a long-form magazine article.

events.title: Active verb headline max 8 words.
  GOOD: "Germany invades Poland without warning"
  BAD:  "The invasion of Poland"

events.summary: One punchy sentence a 16-year-old 
would understand. State what happened AND why it 
mattered. Max 20 words.

events.detail: Exactly 2-3 sentences.
  Sentence 1 — what happened in plain language.
  Sentence 2 — why it happened or who caused it.
  Sentence 3 — what changed as a result.
  Never start with the word "The".

events.subEvents: Each subEvent is a distinct 
moment that happened between this main event and 
the next. Zoom IN — do not restate the parent.
  subEvents.title: What happened in 5 words. 
    Must contain a verb.
  subEvents.desc: One sentence. Must include at 
    least one specific name, number, or place.
    GOOD: "Churchill orders RAF to defend London 
      at all costs after Dunkirk evacuation"
    BAD:  "Things escalated and got more serious"

outro.summary: 2-3 sentences on legacy. Must 
include one fact that would genuinely surprise 
someone who just finished reading. No generalities 
like "this changed the world" — be specific 
and concrete.

outro.question: One question with no easy answer. 
Do NOT start with "What if". Do NOT ask about 
the future. Ask about the nature of what just 
happened. End with ... not a question mark.

related: 3 topic names thematically connected 
to this topic that would make great timelines.

EXAMPLE OF ONE HIGH QUALITY EVENT — match this:
{
  "date": "Jun 1944",
  "title": "Allied forces storm Normandy beaches",
  "summary": "150,000 troops land on five French beaches, opening the front that will end Nazi occupation of Western Europe.",
  "detail": "Operation Overlord was the largest seaborne invasion in history. Despite catastrophic losses at Omaha Beach where 2,000 Americans fell in hours, Allied forces secured a foothold by nightfall. It marked the beginning of the end for Hitler's empire in the West.",
  "type": "war",
  "subEvents": [
    {
      "date": "Jun 5, 1944",
      "title": "Eisenhower gives the order",
      "desc": "Despite poor weather, Eisenhower tells 150,000 troops they go tomorrow."
    },
    {
      "date": "Jun 6, 1944",
      "title": "Paratroopers drop behind enemy lines",
      "desc": "13,000 American paratroopers land in darkness to cut off German reinforcements inland."
    },
    {
      "date": "Jun 6, 1944",
      "title": "Five beaches stormed at dawn",
      "desc": "Allied divisions hit Utah, Omaha, Gold, Juno and Sword simultaneously at 06:30."
    },
    {
      "date": "Jun 7, 1944",
      "title": "Beachhead secured despite heavy losses",
      "desc": "Over 10,000 Allied casualties recorded but all five beaches held by end of day one."
    },
    {
      "date": "Jun 25, 1944",
      "title": "Cherbourg falls to US forces",
      "desc": "First major French port captured, giving Allies a critical supply route for troops inland."
    }
  ]
}

Now generate the full timeline. Return ONLY this 
JSON structure. First character must be { and 
last character must be } with nothing before 
or after:

{
  "topic": "string",
  "intro": "string",
  "events": [
    {
      "date": "string",
      "title": "string",
      "summary": "string",
      "detail": "string",
      "type": "political|war|culture|science|economy|other",
      "subEvents": [
        {
          "date": "string",
          "title": "string",
          "desc": "string"
        }
      ]
    }
  ],
  "outro": {
    "summary": "string",
    "question": "string"
  },
  "related": ["string", "string", "string"],
  "ongoing": false
}

OUTPUT RULES:
- Exactly 10 main events in chronological order
- Exactly 5 subEvents per main event
- ongoing is true only if events are actively 
  unfolding in 2025
- Every string is valid JSON — no unescaped 
  quotes, no line breaks inside strings
- If unsure of exact date, use year only
- First character: {
- Last character: }
- Nothing else`
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