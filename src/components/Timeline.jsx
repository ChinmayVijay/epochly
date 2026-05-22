import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './Timeline.module.css'
import ShareCard from './ShareCard.jsx'
import MiniTimeline from './MiniTimeline.jsx'
import Resources from './Resources.jsx'
import { TOPICS } from '../data.js'
import { useOpenGraph } from '../hooks/useOpenGraph.js'

const TYPE_CONFIG = {
  political: { label: 'Political', cls: styles.tagPolitical, dotBorder: '#378ADD', dotBg: '#E6F1FB' },
  war:       { label: 'War',       cls: styles.tagWar,       dotBorder: '#E24B4A', dotBg: '#FCEBEB' },
  culture:   { label: 'Culture',   cls: styles.tagCulture,   dotBorder: '#7F77DD', dotBg: '#EEEDFE' },
  science:   { label: 'Science',   cls: styles.tagScience,   dotBorder: '#1D9E75', dotBg: '#E1F5EE' },
  economy:   { label: 'Economy',   cls: styles.tagEconomy,   dotBorder: '#BA7517', dotBg: '#FAEEDA' },
  other:     { label: 'Event',     cls: styles.tagOther,     dotBorder: '#ccc',    dotBg: '#f9f9f9' },
}

function getRelatedKeys(data) {
  if (Array.isArray(data.related) && data.related.length > 0) {
    return data.related
  }

  const currentTopicKey = Object.keys(TOPICS).find(
    key => TOPICS[key].topic.toLowerCase() === data.topic.toLowerCase()
  )

  return Object.keys(TOPICS)
    .filter(key => key !== currentTopicKey)
    .slice(0, 3)
}

function EventRow({ event, index }) {
  const [open, setOpen] = useState(false)
  const cfg = TYPE_CONFIG[event.type] || TYPE_CONFIG.other

  return (
    <div className={`${styles.eventRow} eventNode`}>
      <div className={styles.dateCol}>{event.date}</div>
      <div
        className={styles.dot}
        style={{ borderColor: cfg.dotBorder, backgroundColor: cfg.dotBg }}
      ></div>
      <div
        className={`${styles.card} ${open ? styles.cardOpen : ''}`}
        onClick={() => setOpen(!open)}
      >
        <div className={styles.cardHeader}>
          <span className={`${styles.tag} ${cfg.cls}`}>{cfg.label}</span>
          <div className={styles.chevron}>▼</div>
        </div>
        <h3 className={styles.title}>{event.title}</h3>
        <p className={styles.summary}>{event.summary}</p>
        {open && (
          <div className={styles.detail}>
            <p className={styles.detailText}>{event.detail}</p>
            <MiniTimeline subEvents={event.subEvents} />
          </div>
        )}
      </div>
    </div>
  )
}

export default function Timeline({ data, onReset }) {
  const navigate = useNavigate()
  const timelineRef = useRef(null)
  const relatedKeys = getRelatedKeys(data)

  useOpenGraph(data)

  useEffect(() => {
    const nodes = document.querySelectorAll('.eventNode')
    nodes.forEach((el, i) => {
      setTimeout(() => {
        el.style.opacity = '1'
        el.style.transform = 'translateY(0)'
      }, 100 + i * 130)
    })
  }, [])

  function calcReadTime(events) {
    const wordsPerEvent = 40
    const wordsPerMin = 200
    const totalWords = events.length * wordsPerEvent
    const mins = Math.ceil(totalWords / wordsPerMin)
    return mins
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h2 className={styles.topic}>{data.topic}</h2>
        <div className={styles.meta}>
          <span className={styles.count}>{data.events.length} events</span>
          <span className={styles.dot}></span>
          <span className={styles.readTime}>🕒 ~{calcReadTime(data.events)} min read</span>
        </div>
      </div>

      <div className={styles.intro}>
        <p>{data.intro}</p>
      </div>

      <div className={styles.timeline} ref={timelineRef}>
        {data.events.map((ev, i) => (
          <EventRow key={i} event={ev} index={i} />
        ))}
      </div>

      <div className={styles.outro}>
        <p className={styles.outroSummary}>{data.outro.summary}</p>
        <div className={styles.outroRule}></div>
        <div className={styles.outroLabel}>
          <span>✨</span> worth thinking about
        </div>
        <p className={styles.outroQuestion}>{data.outro.question}</p>
      </div>

      {relatedKeys.length > 0 && (
        <div className={styles.related}>
          <div className={styles.relatedLabel}>More like this</div>
          <div className={styles.relatedGrid}>
            {relatedKeys.map((relatedKey, index) => {
              const relatedTopic = TOPICS[relatedKey]
              const displayName = relatedTopic
                ? relatedTopic.topic
                : relatedKey
              const slug = displayName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '')
              return (
                <div
                  key={index}
                  className={styles.relatedCard}
                  onClick={() => navigate('/timeline/' + slug)}
                >
                  <h4>{displayName}</h4>
                  {relatedTopic && (
                    <p>{relatedTopic.intro.substring(0, 100)}...</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <Resources topic={data.topic} />

      <div className={styles.footer}>
        <button
          className={styles.resetBtn}
          onClick={() => {
            if (onReset) {
              onReset()
            } else {
              navigate('/')
            }
          }}
        >
          ← Explore another topic
        </button>
        <ShareCard data={data} />
      </div>
    </div>
  )
}
