import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export function useTimeline(slug) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!slug) return

    async function fetch() {
      setLoading(true)
      setError(null)
      setData(null)

      try {
        const { data: topic, error: topicErr } =
          await supabase
            .from('topics')
            .select(`
              id,
              title,
              slug,
              description,
              intro,
              outro_summary,
              outro_question,
              related_slugs,
              ongoing,
              recency_tier,
              tier_updated_at,
              cover_color_from,
              cover_color_to,
              event_count,
              published_at,
              categories (
                id,
                name,
                slug,
                icon
              )
            `)
            .eq('slug', slug)
            .eq('is_published', true)
            .is('deleted_at', null)
            .single()

        if (topicErr) throw topicErr
        if (!topic) throw new Error('Timeline not found')

        const [
          { data: events, error: evErr },
          { data: books, error: bkErr },
          { data: videos, error: vidErr }
        ] = await Promise.all([
          supabase
            .from('events')
            .select(`
              id,
              date_label,
              date_sort,
              title,
              summary,
              detail,
              event_type,
              sort_order,
              sub_event_count,
              sub_events (
                id,
                date_label,
                date_sort,
                title,
                description,
                event_type,
                sort_order
              )
            `)
            .eq('topic_id', topic.id)
            .order('sort_order', { ascending: true }),
          supabase
            .from('books')
            .select(`
              id,
              title,
              author,
              isbn10,
              amazon_url,
              flipkart_url,
              is_verified,
              sort_order
            `)
            .eq('topic_id', topic.id)
            .order('sort_order', { ascending: true }),
          supabase
            .from('videos')
            .select(`
              id,
              youtube_id,
              title,
              channel_name,
              thumbnail_url,
              sort_order
            `)
            .eq('topic_id', topic.id)
            .order('sort_order', { ascending: true })
        ])

        if (evErr) throw evErr

        const eventsWithSorted = (events || []).map(ev => ({
          ...ev,
          sub_events: (ev.sub_events || [])
            .sort((a, b) => a.sort_order - b.sort_order)
        }))

        setData({
          topic,
          events: eventsWithSorted,
          books: books || [],
          videos: videos || []
        })
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [slug])

  return { data, loading, error }
}
