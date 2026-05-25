import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export function useTopics({
  categorySlug = null,
  featured = false,
  limit = null,
  orderBy = 'published_at'
} = {}) {
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetch() {
      setLoading(true)
      setError(null)
      try {
        let query = supabase
          .from('topics')
          .select(`
            id,
            title,
            slug,
            description,
            intro,
            cover_color_from,
            cover_color_to,
            is_featured,
            ongoing,
            recency_tier,
            published_at,
            event_count,
            categories (
              id,
              name,
              slug,
              icon
            )
          `)
          .eq('is_published', true)
          .is('deleted_at', null)
          .order(orderBy, { ascending: false })

        if (categorySlug) {
          const { data: cat } = await supabase
            .from('categories')
            .select('id')
            .eq('slug', categorySlug)
            .single()
          if (cat) query = query.eq('category_id', cat.id)
        }

        if (featured) {
          query = query.eq('is_featured', true)
        }

        if (limit) {
          query = query.limit(limit)
        }

        const { data, error: err } = await query
        if (err) throw err
        setTopics(data || [])
      } catch (err) {
        setError(err.message)
        setTopics([])
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [categorySlug, featured, limit, orderBy])

  return { topics, loading, error }
}
