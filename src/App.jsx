import { useState, useEffect, useRef } from 'react'
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

// ── Static homepage data (Supabase later) ───────────────────────
const BREAKING = [
  { slug: 'india-pakistan-ceasefire', title: 'India-Pakistan Ceasefire Negotiations', tier: 'breaking', update: 'Updated 2 hours ago · Day 4' },
  { slug: 'gaza-ceasefire-talks', title: 'Gaza Ceasefire Talks', tier: 'developing', update: 'Updated yesterday · Week 3' },
  { slug: 'uk-election-2025', title: 'UK General Election 2025', tier: 'recent', update: 'Updated 3 days ago' },
  { slug: 'openai-gpt5-launch', title: 'OpenAI GPT-5 Launch Fallout', tier: 'developing', update: 'Updated 5 hours ago · Day 8' },
]
const FEATURED = [
  { slug: 'nelson-mandela', title: 'Nelson Mandela', category: 'Personalities', description: 'From political prisoner to president — the most improbable journey in modern history.', events: 10, readTime: '8 min', coverFrom: '#1a0533', coverTo: '#3d1a6e', large: true },
  { slug: 'world-war-ii', title: 'World War II', category: 'Events', events: 10, readTime: '9 min', coverFrom: '#0a1628', coverTo: '#1a3a5c', large: false },
  { slug: 'history-of-ai', title: 'History of AI', category: 'Science', events: 10, readTime: '7 min', coverFrom: '#0a1a10', coverTo: '#1a4025', large: false },
]
const CATEGORIES = [
  { slug: 'personalities', name: 'Personalities', icon: '👤', count: 14 },
  { slug: 'events',        name: 'Events',        icon: '📅', count: 14 },
  { slug: 'countries',     name: 'Countries',     icon: '🌍', count: 14 },
  { slug: 'technology',    name: 'Technology',    icon: '💻', count: 14 },
  { slug: 'science',       name: 'Science',       icon: '🔬', count: 14 },
  { slug: 'geopolitics',   name: 'Geopolitics',   icon: '🗺️', count: 14 },
  { slug: 'entertainment', name: 'Entertainment', icon: '🎬', count: 14 },
]
const RECENT = [
  { slug: 'history-of-india',    title: 'History of India',      category: 'Countries',      events: 10, readTime: '8 min', coverFrom: '#1a1200', coverTo: '#4a3500' },
  { slug: 'iphone',              title: 'The iPhone',            category: 'Technology',     events: 10, readTime: '7 min', coverFrom: '#0a0a1a', coverTo: '#1a2040' },
  { slug: 'the-cold-war',        title: 'The Cold War',          category: 'Geopolitics',    events: 10, readTime: '9 min', coverFrom: '#0b132b', coverTo: '#1c2541' },
  { slug: 'history-of-hollywood',title: 'History of Hollywood',  category: 'Entertainment',  events: 10, readTime: '8 min', coverFrom: '#1b1b1b', coverTo: '#4a2c2a' },
]

const TIER_LABEL = { breaking: 'Live', developing: 'Developing', recent: 'Recent' }

function ComingSoon() {
  const navigate = useNavigate()
  return (
    <div className={styles.app} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
      <p style={{ fontSize: '2rem' }}>🚧</p>
      <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)' }}>Coming soon</p>
      <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>This page is under construction.</p>
      <button onClick={() => navigate('/')} className={styles.themeToggle} style={{ marginTop: '0.5rem' }}>← Back home</button>
    </div>
  )
}

function HomeView() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    if (!dropdownOpen) return
    function onOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [dropdownOpen])

  function handleSubscribe(e) {
    e.preventDefault()
    setSubscribed(true)
  }

  return (
    <div className={styles.homePage}>

      {/* ── NAV ── */}
      <nav className={styles.homeNav}>
        <div className={styles.homeNavInner}>
          <div
            className={styles.logoWrap}
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            <Logo size={28} />
            <span className={styles.homeLogoText}>
              Epochly<span className={styles.homeLogoAi}>.ai</span>
            </span>
          </div>
          <div className={styles.homeNavRight}>
            <button className={styles.homeNavBtn} onClick={() => navigate('/browse')}>Browse</button>
            <button className={styles.homeNavBtn} onClick={() => navigate('/recent')}>Recent Events</button>
            <ThemeToggle />
            <div className={styles.avatarWrap} ref={dropdownRef}>
              <button
                className={styles.avatarBtn}
                onClick={() => setDropdownOpen(o => !o)}
                aria-label="Account"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
              </button>
              {dropdownOpen && (
                <div className={styles.avatarDropdown}>
                  <button
                    className={styles.dropdownItem}
                    onClick={() => { navigate('/signin'); setDropdownOpen(false) }}
                  >
                    Sign in
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className={styles.homeContent}>

        {/* ── BREAKING STRIP ── */}
        <section className={styles.homeSection}>
          <div className={styles.secHead}>
            <svg className={styles.secIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <span className={styles.secTitle}>Live &amp; developing</span>
            <div className={styles.secLine} />
            <button className={styles.secLink} onClick={() => navigate('/recent')}>See all →</button>
          </div>
          <div className={styles.breakingRow}>
            {BREAKING.map(item => (
              <div
                key={item.slug}
                className={`${styles.breakingCard} ${item.tier === 'breaking' ? styles.breakingCardLive : ''}`}
                onClick={() => navigate(`/timeline/${item.slug}`)}
              >
                <div className={`${styles.tierBadge} ${styles['tier_' + item.tier]}`}>
                  <span className={`${styles.tierDot} ${styles['tierDot_' + item.tier]}`} />
                  {TIER_LABEL[item.tier]}
                </div>
                <p className={styles.breakingTitle}>{item.title}</p>
                <p className={styles.breakingUpdate}>{item.update}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── EDITOR'S PICKS ── */}
        <section className={styles.homeSection}>
          <div className={styles.secHead}>
            <svg className={styles.secIcon} width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l2.9 6.3 6.8.9-5 4.7 1.2 6.8L12 17.7l-5.9 3 1.2-6.8L2.3 9.2l6.8-.9L12 2z" />
            </svg>
            <span className={styles.secTitle}>Editor&apos;s picks</span>
            <div className={styles.secLine} />
            <span className={styles.secSub}>Featured this week</span>
          </div>
          <div className={styles.featuredGrid}>
            {FEATURED.filter(f => f.large).map(item => (
              <div
                key={item.slug}
                className={styles.featuredLarge}
                onClick={() => navigate(`/timeline/${item.slug}`)}
              >
                <div
                  className={styles.featuredLargeCover}
                  style={{ background: `linear-gradient(135deg,${item.coverFrom},${item.coverTo})` }}
                >
                  <span className={styles.coverPill}>{item.category}</span>
                </div>
                <div className={styles.featuredLargeBody}>
                  <p className={styles.featuredTitle}>{item.title}</p>
                  <p className={styles.featuredDesc}>{item.description}</p>
                  <p className={styles.featuredMeta}>{item.events} events · {item.readTime}</p>
                </div>
              </div>
            ))}
            <div className={styles.featuredSmallRow}>
              {FEATURED.filter(f => !f.large).map(item => (
                <div
                  key={item.slug}
                  className={styles.featuredSmall}
                  onClick={() => navigate(`/timeline/${item.slug}`)}
                >
                  <div
                    className={styles.featuredSmallCover}
                    style={{ background: `linear-gradient(135deg,${item.coverFrom},${item.coverTo})` }}
                  >
                    <span className={styles.coverPill}>{item.category}</span>
                  </div>
                  <div className={styles.featuredSmallBody}>
                    <p className={styles.featuredTitle}>{item.title}</p>
                    <p className={styles.featuredMeta}>{item.events} events · {item.readTime}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── BROWSE BY CATEGORY ── */}
        <section className={styles.homeSection}>
          <div className={styles.secHead}>
            <svg className={styles.secIcon} width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="0" y="0" width="6" height="6" rx="1" />
              <rect x="8" y="0" width="6" height="6" rx="1" />
              <rect x="0" y="8" width="6" height="6" rx="1" />
              <rect x="8" y="8" width="6" height="6" rx="1" />
            </svg>
            <span className={styles.secTitle}>Browse by category</span>
            <div className={styles.secLine} />
          </div>
          <div className={styles.categoriesRow}>
            {CATEGORIES.map(cat => (
              <div
                key={cat.slug}
                className={styles.categoryCard}
                onClick={() => navigate(`/category/${cat.slug}`)}
              >
                <span className={styles.categoryIcon}>{cat.icon}</span>
                <span className={styles.categoryName}>{cat.name}</span>
                <span className={styles.categoryCount}>{cat.count} topics</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── RECENTLY ADDED ── */}
        <section className={styles.homeSection}>
          <div className={styles.secHead}>
            <svg className={styles.secIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className={styles.secTitle}>Recently added</span>
            <div className={styles.secLine} />
            <button className={styles.secLink} onClick={() => navigate('/recent')}>View all →</button>
          </div>
          <div className={styles.recentList}>
            {RECENT.map(item => (
              <div
                key={item.slug}
                className={styles.recentCard}
                onClick={() => navigate(`/timeline/${item.slug}`)}
              >
                <div
                  className={styles.recentCover}
                  style={{ background: `linear-gradient(135deg,${item.coverFrom},${item.coverTo})` }}
                />
                <div className={styles.recentInfo}>
                  <span className={styles.recentCategory}>{item.category}</span>
                  <span className={styles.recentTitle}>{item.title}</span>
                  <span className={styles.recentMeta}>{item.events} events · {item.readTime}</span>
                </div>
                <span className={styles.recentChevron}>›</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── NEWSLETTER ── */}
        <section className={styles.newsletterSection}>
          <div className={styles.newsletterRow}>
            <div className={styles.newsletterLeft}>
              <p className={styles.newsletterTitle}>Weekly digest</p>
              <p className={styles.newsletterSub}>New timelines every week. No spam.</p>
            </div>
            <div className={styles.newsletterRight}>
              {subscribed ? (
                <p className={styles.newsletterThanks}>Thanks — you&apos;re in!</p>
              ) : (
                <form className={styles.newsletterForm} onSubmit={handleSubscribe}>
                  <input
                    className={styles.newsletterInput}
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                  <button className={styles.newsletterBtn} type="submit">Subscribe</button>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className={styles.homeFooter}>
          <span className={styles.footerLeft}>
            Epochly.ai — explore history one timeline at a time
          </span>
          <div className={styles.footerRight}>
            <button className={styles.footerLink} onClick={() => navigate('/about')}>About</button>
            <button className={styles.footerLink} onClick={() => navigate('/privacy')}>Privacy</button>
            <button className={styles.footerLink} onClick={() => navigate('/affiliate')}>Affiliate disclosure</button>
          </div>
        </footer>

      </div>
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
      <Route path="/"                element={<HomeView />} />
      <Route path="/timeline/:slug"  element={<TimelineView />} />
      <Route path="/browse"          element={<ComingSoon />} />
      <Route path="/recent"          element={<ComingSoon />} />
      <Route path="/signin"          element={<ComingSoon />} />
      <Route path="/category/:slug"  element={<ComingSoon />} />
      <Route path="/profile"         element={<ComingSoon />} />
      <Route path="/about"           element={<ComingSoon />} />
      <Route path="/privacy"         element={<ComingSoon />} />
      <Route path="/affiliate"       element={<ComingSoon />} />
      <Route path="*"                element={<Navigate to="/" replace />} />
    </Routes>
  )
}