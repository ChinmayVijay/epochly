import { useState, useEffect, useRef } from 'react'
import { searchTopics } from '../data.js'

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY

async function fetchAISuggestions(query) {
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
        max_tokens: 200,
        messages: [
          {
            role: 'system',
            content: `You are a search suggestion engine. 
Return ONLY a valid JSON array of strings. 
No markdown, no explanation, no code fences.
Each string is a topic name that could have 
a historical timeline.`
          },
          {
            role: 'user',
            content: `The user typed: "${query}"
            
Suggest 4 specific topics related to this query 
that would make great historical timelines.
Topics should be real, well-known subjects.
Do not repeat the exact query — suggest related 
or more specific variations.

Return ONLY a JSON array like:
["Topic One", "Topic Two", "Topic Three", "Topic Four"]

JSON array only, nothing else.`
          }
        ]
      })
    }
  )
  if (!res.ok) return []
  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content || '[]'
  const cleaned = raw.replace(/\`\`\`json|\`\`\`/g, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function useSuggestions(query) {
  const [staticSuggestions, setStaticSuggestions] = 
    useState([])
  const [aiSuggestions, setAiSuggestions] = 
    useState([])
  const [aiLoading, setAiLoading] = useState(false)
  const debounceRef = useRef(null)
  const abortRef = useRef(false)

  useEffect(() => {
    const trimmed = query.trim()

    if (trimmed.length === 0) {
      setStaticSuggestions([])
      setAiSuggestions([])
      setAiLoading(false)
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      return
    }

    const staticResults = searchTopics(trimmed)
    setStaticSuggestions(staticResults)

    if (trimmed.length < 3) {
      setAiSuggestions([])
      setAiLoading(false)
      return
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    abortRef.current = false
    setAiLoading(true)

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await fetchAISuggestions(trimmed)
        if (!abortRef.current) {
          const staticLabels = staticResults
            .map(s => s.label.toLowerCase())
          const filtered = results.filter(r =>
            !staticLabels.includes(r.toLowerCase())
          )
          setAiSuggestions(filtered.slice(0, 4))
        }
      } catch {
        if (!abortRef.current) setAiSuggestions([])
      } finally {
        if (!abortRef.current) setAiLoading(false)
      }
    }, 600)

    return () => {
      abortRef.current = true
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query])

  return { staticSuggestions, aiSuggestions, aiLoading }
}
