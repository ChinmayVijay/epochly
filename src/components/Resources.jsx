import { useState, useEffect } from 'react'
import styles from './Resources.module.css'

const YT_KEY = import.meta.env.VITE_YOUTUBE_API_KEY
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY
const AMZ_TAG = import.meta.env.VITE_AMAZON_AFFILIATE_TAG 
  || 'epochlyai-21'

async function fetchYouTubeVideos(topic) {
  const query = encodeURIComponent(
    `${topic} history documentary`
  )
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search` +
    `?part=snippet&q=${query}&type=video` +
    `&maxResults=3&relevanceLanguage=en` +
    `&key=${YT_KEY}`
  )
  if (!res.ok) throw new Error('YouTube error')
  const data = await res.json()
  return (data.items || []).map(item => ({
    id: item.id.videoId,
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
    thumb: item.snippet.thumbnails.medium.url,
    url: `https://youtube.com/watch?v=${item.id.videoId}`
  }))
}

async function fetchBookTitles(topic) {
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
        temperature: 0.3,
        max_tokens: 400,
        messages: [
          {
            role: 'system',
            content: `You are a book recommendation expert.
Return ONLY a valid JSON array. No markdown, no 
explanation, no code fences.`
          },
          {
            role: 'user',
            content: `Recommend 6 well-known books 
about "${topic}". Only include famous, widely 
available books that definitely exist.

Return ONLY this JSON array:
[
  {
    "title": "Exact book title",
    "author": "Author full name"
  }
]

6 books only. JSON array only. Nothing else.`
          }
        ]
      })
    }
  )
  if (!res.ok) throw new Error('Groq error')
  const data = await res.json()
  const raw = data.choices?.[0]
    ?.message?.content || '[]'
  const cleaned = raw
    .replace(/```json|```/g, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function lookupBook(title, author) {
  try {
    const query = encodeURIComponent(
      `${title} ${author}`
    )
    const res = await fetch(
      `https://openlibrary.org/search.json` +
      `?q=${query}&fields=title,author_name,isbn&limit=1`
    )
    if (!res.ok) return null
    const data = await res.json()
    const book = data.docs?.[0]
    if (!book) return null

    const isbns = book.isbn || []
    const isbn10 = isbns.find(
      i => i.length === 10 &&
      /^[0-9]{9}[0-9X]$/.test(i)
    )

    return {
      title: book.title || title,
      author: book.author_name?.[0] || author,
      asin: isbn10 || null,
      verified: !!isbn10
    }
  } catch {
    return null
  }
}

async function fetchBooks(topic) {
  const suggestions = await fetchBookTitles(topic)
  if (!suggestions.length) return []

  const results = await Promise.allSettled(
    suggestions.map(b => lookupBook(b.title, b.author))
  )

  const books = []

  results.forEach((result, i) => {
    const original = suggestions[i]
    const looked = result.status === 'fulfilled'
      ? result.value
      : null

    if (looked && looked.asin) {
      books.push({
        title: looked.title,
        author: looked.author,
        asin: looked.asin,
        amazonUrl: `https://www.amazon.in/dp/` +
          `${looked.asin}?tag=${AMZ_TAG}`,
        verified: true
      })
    } else {
      books.push({
        title: original.title,
        author: original.author,
        asin: null,
        amazonUrl: `https://www.amazon.in/s?k=` +
          encodeURIComponent(
            original.title + ' ' + original.author
          ) + `&tag=${AMZ_TAG}`,
        verified: false
      })
    }
  })

  return books
    .sort((a, b) => b.verified - a.verified)
    .slice(0, 5)
}

const COVER_COLORS = [
  'linear-gradient(135deg,#1a0533,#3d1a6e)',
  'linear-gradient(135deg,#0a1628,#1a3a5c)',
  'linear-gradient(135deg,#1a1200,#4a3500)',
  'linear-gradient(135deg,#0a1a10,#1a4025)',
  'linear-gradient(135deg,#1a0a0a,#4a1515)',
]

export default function Resources({ topic }) {
  const [videos, setVideos] = useState([])
  const [books, setBooks] = useState([])
  const [ytStatus, setYtStatus] = useState('loading')
  const [bookStatus, setBookStatus] = useState('loading')

  useEffect(() => {
    if (!topic) return
    setYtStatus('loading')
    setBookStatus('loading')
    setVideos([])
    setBooks([])

    fetchYouTubeVideos(topic)
      .then(data => {
        setVideos(data)
        setYtStatus('success')
      })
      .catch(() => setYtStatus('error'))

    fetchBooks(topic)
      .then(data => {
        setBooks(data)
        setBookStatus('success')
      })
      .catch(() => setBookStatus('error'))

  }, [topic])

  return (
    <div className={styles.wrap}>

      <div className={styles.section}>
        <div className={styles.secHead}>
          <i className="ti ti-brand-youtube"
            style={{ color: '#E24B4A', fontSize: '15px' }}
            aria-hidden="true" />
          <span className={styles.secTitle}>
            Watch & Learn
          </span>
          <div className={styles.secLine} />
          <span className={styles.secCount}>
            3 videos
          </span>
        </div>

        {ytStatus === 'loading' && (
          <div className={styles.skeletons}>
            {[1,2,3].map(i => (
              <div key={i} className={styles.skeletonYt} />
            ))}
          </div>
        )}

        {ytStatus === 'error' && (
          <p className={styles.errMsg}>
            Could not load videos.
          </p>
        )}

        {ytStatus === 'success' && (
          <div className={styles.ytList}>
            {videos.map((v, i) => (
              <a
                key={i}
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.ytCard}
              >
                <div className={styles.ytThumb}>
                  <img
                    src={v.thumb}
                    alt={v.title}
                    className={styles.ytImg}
                    loading="lazy"
                  />
                  <div className={styles.ytPlay}>
                    <i className="ti ti-player-play"
                      style={{ fontSize:'11px',
                        color:'white',
                        marginLeft:'2px' }}
                      aria-hidden="true" />
                  </div>
                </div>
                <div className={styles.ytInfo}>
                  <span className={styles.ytChannel}>
                    {v.channel}
                  </span>
                  <p className={styles.ytTitle}>
                    {v.title}
                  </p>
                  <span className={styles.ytCta}>
                    Watch on YouTube →
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.secHead}>
          <i className="ti ti-books"
            style={{ color:'#c9a96e', fontSize:'15px' }}
            aria-hidden="true" />
          <span className={styles.secTitle}>
            Books to Read
          </span>
          <div className={styles.secLine} />
          <span className={styles.secCount}>
            5 books
          </span>
        </div>

        {bookStatus === 'loading' && (
          <div className={styles.booksGrid}>
            {[1,2,3,4,5].map(i => (
              <div key={i}
                className={styles.skeletonBook} />
            ))}
          </div>
        )}

        {bookStatus === 'error' && (
          <p className={styles.errMsg}>
            Could not load books.
          </p>
        )}

        {bookStatus === 'success' && (
          <>
            <div className={styles.booksGrid}>
              {books.map((b, i) => (
                <a
                  key={i}
                  href={b.amazonUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={
                    b.verified
                      ? `Buy "${b.title}" on Amazon`
                      : `Search "${b.title}" on Amazon`
                  }
                  className={styles.bookCard}
                >
                  <div
                  className={styles.bookCover}
                  style={{ background: COVER_COLORS[i] }}
                >
                  {i === 0 && (
                    <span className={styles.bestBadge}>
                      Best
                    </span>
                  )}
                  {b.verified && (
                    <span className={styles.verifiedBadge}>
                      ✓
                    </span>
                  )}
                  <div className={styles.coverText}>
                    <div className={styles.coverTitle}>
                      {b.title}
                    </div>
                    <div className={styles.coverAuthor}>
                      {b.author}
                    </div>
                  </div>
                </div>
                <div className={styles.bookInfo}>
                  <span className={styles.bookTitle}>
                    {b.title}
                  </span>
                  <span className={styles.bookAuthor}>
                    {b.author}
                  </span>
                  <span className={styles.bookCta}>
                    {b.verified
                      ? 'Buy on Amazon →'
                      : 'Search on Amazon →'
                    }
                  </span>
                </div>

                </a>
              ))}
            </div>
            <p className={styles.affNote}>
              <i className="ti ti-info-circle"
                style={{ fontSize:'11px' }}
                aria-hidden="true" />
              Affiliate links — buying supports Epochly
              at no extra cost to you
            </p>
          </>
        )}
      </div>

    </div>
  )
}
