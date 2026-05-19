import { useEffect } from 'react'

export function useOpenGraph(data) {
  useEffect(() => {
    if (!data) return

    const slug = data.topic
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .trim()

    const title = `${data.topic} — Epochly.ai`

    const firstSentence = data.intro
      ? data.intro.split('.')[0] + '.'
      : `Explore the history of ${data.topic}.`

    const description = `${firstSentence} 
      ${data.events.length} key events.`

    const image = 
      `https://epochly.ai/og-${slug}.png`

    const url = window.location.href

    document.title = title

    setMeta('property', 'og:title',       title)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:image',       image)
    setMeta('property', 'og:url',         url)
    setMeta('name', 'twitter:title',       title)
    setMeta('name', 'twitter:description', description)
    setMeta('name', 'twitter:image',       image)

    return () => {
      document.title = 
        'Epochly.ai — Explore Any Topic Through Time'
      setMeta('property', 'og:title',
        'Epochly.ai — Explore Any Topic Through Time')
      setMeta('property', 'og:url', 
        'https://epochly.ai')
    }
  }, [data])
}

function setMeta(attr, key, content) {
  let el = document.querySelector(
    `meta[${attr}="${key}"]`
  )
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}
