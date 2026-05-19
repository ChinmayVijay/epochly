import { useState } from 'react'
import html2canvas from 'html2canvas'
import styles from './ShareCard.module.css'
import Logo from './Logo.jsx'

export default function ShareCard({ data }) {
  const [loading, setLoading] = useState(false)

  const handleShare = async () => {
    setLoading(true)
    try {
      const cardElement = document.getElementById('share-card')
      const canvas = await html2canvas(cardElement, { scale: 3 })
      const imgData = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = imgData
      link.download = `epochly-${data.topic.toLowerCase().replace(/\s+/g, '-')}.png`
      link.click()
    } catch (error) {
      console.error('Error generating image:', error)
    } finally {
      setLoading(false)
    }
  }

  const firstDate = data.events[0]?.date
  const lastDate = data.events[data.events.length - 1]?.date
  const dateRange = `${firstDate} - ${lastDate}`
  const eventCount = data.events.length
  const shouldShowGap = eventCount > 5
  const skippedCount = eventCount - 5

  // Calculate skipped years from the dates at the gap boundaries
  const firstSkippedEventIndex = 2
  const lastSkippedEventIndex = eventCount - 3
  const firstSkippedDate = data.events[firstSkippedEventIndex]?.date || ''
  const lastSkippedDate = data.events[lastSkippedEventIndex]?.date || ''
  
  // Extract year from date string (assumes format like "1997", "Jul 1994", "Aug 1991", etc.)
  const getYear = (dateStr) => {
    const yearMatch = dateStr.match(/\d{4}/)
    return yearMatch ? yearMatch[0] : ''
  }
  
  const skippedYears = `${getYear(firstSkippedDate)}-${getYear(lastSkippedDate)}`

  return (
    <>
      <div id="share-card" className={styles.shareCard}>
        <div className={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Logo size={18} />
            <span style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: 'var(--text)', letterSpacing: '-0.02em' }}>
              Epochly<span style={{ fontSize: '9px', color: 'var(--accent)', verticalAlign: 'super', fontFamily: 'sans-serif' }}>.ai</span>
            </span>
          </div>
          <h1 className={styles.topic}>{data.topic}</h1>
          <div className={styles.subtitle}>
            {dateRange} • {eventCount} events
          </div>
        </div>

        <div className={styles.divider}></div>

        <div className={styles.events}>
          {data.events.slice(0, 3).map((event, index) => (
            <div key={index} className={styles.event}>
              <div className={styles.eventDotCol}>
                <div className={styles.eventDot}></div>
              </div>
              <div className={styles.eventContent}>
                <div className={styles.eventTitle}>{event.title}</div>
                <div className={styles.eventMeta}>
                  {event.date} • {event.type}
                </div>
              </div>
            </div>
          ))}

          {shouldShowGap && (
            <div className={styles.eventGap}>
              <div className={styles.gapDots}>
                <div className={styles.gapDot}></div>
                <div className={styles.gapDot}></div>
                <div className={styles.gapDot}></div>
              </div>
              <div className={styles.gapLabel}>
                {skippedCount} events across {skippedYears}
              </div>
            </div>
          )}

          {data.events.slice(-2).map((event, index) => (
            <div key={eventCount - 2 + index} className={styles.event}>
              <div className={styles.eventDotCol}>
                <div className={styles.eventDot}></div>
              </div>
              <div className={styles.eventContent}>
                <div className={styles.eventTitle}>{event.title}</div>
                <div className={styles.eventMeta}>
                  {event.date} • {event.type}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          <div className={styles.question}>
            "{data.outro.question}
          </div>
        </div>

        <div className={styles.watermark}>epochly.ai</div>
      </div>

      <button
        className={styles.shareButton}
        onClick={handleShare}
        disabled={loading}
      >
        {loading ? 'Generating...' : 'Share as Image'}
      </button>
    </>
  )
}