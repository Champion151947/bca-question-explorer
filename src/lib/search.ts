import MiniSearch from 'minisearch'
import { loadSearchIndex } from './data'
import type { SearchDoc, Tier } from './types'

export interface SearchHit {
  id: string
  subjectSlug: string
  subject: string
  title: string
  tier: Tier | ''
  type: string
  terms: string[]
}

let miniPromise: Promise<MiniSearch<SearchDoc>> | null = null

export function getSearch(): Promise<MiniSearch<SearchDoc>> {
  if (!miniPromise) {
    miniPromise = loadSearchIndex().then(({ documents }) => {
      const ms = new MiniSearch<SearchDoc>({
        idField: 'id',
        fields: ['title', 'subject', 'keywords'],
        storeFields: ['subjectSlug', 'subject', 'title', 'tier', 'type'],
        searchOptions: {
          boost: { title: 3, subject: 2, keywords: 1.5 },
          prefix: true,
          fuzzy: 0.2,
        },
      })
      ms.addAll(documents)
      return ms
    })
  }
  return miniPromise
}

export async function runSearch(query: string, limit = 40): Promise<SearchHit[]> {
  const q = query.trim()
  if (!q) return []
  const ms = await getSearch()
  const results = ms.search(q, { combineWith: 'AND' })
  return results.slice(0, limit).map((r) => ({
    id: String(r.id),
    subjectSlug: String(r.subjectSlug),
    subject: String(r.subject),
    title: String(r.title),
    tier: (r.tier as Tier) || '',
    type: String(r.type),
    terms: (r.terms as string[]) || [],
  }))
}

/** Split text into [before, match, after] segments for highlighting. */
export function highlight(text: string, terms: string[]): { text: string; hit: boolean }[] {
  if (!terms.length) return [{ text, hit: false }]
  const escaped = terms
    .filter((t) => t.length >= 2)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (!escaped.length) return [{ text, hit: false }]
  const lowerTerms = new Set(terms.map((t) => t.toLowerCase()))
  const re = new RegExp(`(${escaped.join('|')})`, 'ig')
  const parts = text.split(re)
  return parts
    .filter((p) => p !== '')
    .map((p) => ({ text: p, hit: lowerTerms.has(p.toLowerCase()) }))
}
