import { useRef } from 'react'
import styles from './MiniTimeline.module.css'

export default function MiniTimeline({ subEvents }) {
  const scrollRef = useRef(null)
  let isDown = false
  let startX = 0
  let scrollLeft = 0
  let touchStartX = 0
  let touchScrollLeft = 0

  if (!subEvents || subEvents.length === 0) return null

  function onMouseDown(e) {
    isDown = true
    scrollRef.current.style.cursor = 'grabbing'
    startX = e.pageX - scrollRef.current.offsetLeft
    scrollLeft = scrollRef.current.scrollLeft
  }

  function onMouseLeave() {
    isDown = false
    if (scrollRef.current)
      scrollRef.current.style.cursor = 'grab'
  }

  function onMouseUp() {
    isDown = false
    if (scrollRef.current)
      scrollRef.current.style.cursor = 'grab'
  }

  function onMouseMove(e) {
    if (!isDown) return
    e.preventDefault()
    const x = e.pageX - scrollRef.current.offsetLeft
    const walk = (x - startX) * 1.5
    scrollRef.current.scrollLeft = scrollLeft - walk
  }

  function onTouchStart(e) {
    touchStartX = e.touches[0].pageX
    touchScrollLeft = scrollRef.current.scrollLeft
  }

  function onTouchMove(e) {
    const x = e.touches[0].pageX
    const walk = (touchStartX - x) * 1.5
    scrollRef.current.scrollLeft = touchScrollLeft + walk
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.label}>
        <i className="ti ti-timeline" 
          aria-hidden="true" />
        What happened next
      </div>

      <div
        className={styles.scroll}
        ref={scrollRef}
        onMouseDown={onMouseDown}
        onMouseLeave={onMouseLeave}
        onMouseUp={onMouseUp}
        onMouseMove={onMouseMove}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
      >
        <div className={styles.inner}>
          {subEvents.map((ev, i) => (
            <div key={i} className={styles.node}>
              <div className={styles.dotRow}>
                <div className={styles.dot} />
              </div>
              <div className={styles.card}>
                <div className={styles.date}>
                  {ev.date}
                </div>
                <div className={styles.title}>
                  {ev.title}
                </div>
                <div className={styles.desc}>
                  {ev.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
