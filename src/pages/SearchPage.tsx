import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EmptyState, TierBadge } from '../components/ui'
import { IconSearch, IconClose } from '../components/icons'
import { highlight, runSearch, type SearchHit } from '../lib/search'
import { useStore } from '../store/useStore'

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const showOnce = useStore((s) => s.showOnceSearch)
  const toggleOnce = useStore((s) => s.toggleShowOnceSearch)

  useEffect(() => {
    setQ(params.get('q') || '')
  }, [params])

  useEffect(() => {
    let alive = true
    if (!q.trim()) {
      setHits([])
      return undefined
    }
    setLoading(true)
    const t = setTimeout(() => {
      runSearch(q, 60)
        .then((h) => {
          if (alive) setHits(h)
        })
        .finally(() => alive && setLoading(false))
    }, 160)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [q])

  const visible = useMemo(() => {
    let list = hits
    if (!showOnce) list = list.filter((h) => h.tier !== 'once')
    return list
  }, [hits, showOnce])

  const subjectHits = visible.filter((h) => h.type === 'subject')
  const questionHits = visible.filter((h) => h.type !== 'subject')

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-bold">Search</h1>
        <p className="text-sm text-muted">
          Type any topic across every subject. “Asked once” questions are hidden by default.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-line/15 bg-surface2/60 px-3 py-2">
          <IconSearch width={18} height={18} className="text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              const next = new URLSearchParams(params)
              if (e.target.value) next.set('q', e.target.value)
              else next.delete('q')
              setParams(next, { replace: true })
            }}
            placeholder="deadlock, normalization, CRC, TCP…"
            className="w-full bg-transparent py-1 text-base outline-none"
            aria-label="Search questions"
          />
          {q ? (
            <button className="btn-ghost !px-2" onClick={() => setQ('')} aria-label="Clear search">
              <IconClose width={16} height={16} />
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted">
          <button
            onClick={toggleOnce}
            aria-pressed={showOnce}
            className={`rounded-lg border px-2.5 py-1.5 ${
              showOnce ? 'border-primary/50 bg-primary/15 text-primary' : 'border-line/15 bg-surface'
            }`}
          >
            {showOnce ? 'Showing' : 'Hide'} asked-once
          </button>
          <span>
            {loading ? 'Searching…' : `${visible.length} result${visible.length === 1 ? '' : 's'}`}
          </span>
        </div>
      </div>

      {q && !visible.length && !loading ? (
        <EmptyState title="No matches">
          Try fewer or shorter words. Spelling follows the scanned papers, which can be messy.
        </EmptyState>
      ) : null}

      {subjectHits.length ? (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Subjects</h2>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {subjectHits.map((h) => (
              <li key={h.id}>
                <Link to={`/subject/${h.subjectSlug}`} className="card block p-3 hover:border-primary/40">
                  <span className="font-medium">{h.title}</span>
                  <span className="block text-xs text-muted">{h.subject}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {questionHits.length ? (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Questions</h2>
          <ul className="flex flex-col gap-2">
            {questionHits.map((h) => (
              <li key={h.id}>
                <Link
                  to={`/subject/${h.subjectSlug}?focus=${encodeURIComponent(h.id)}`}
                  className="card block p-3 hover:border-primary/40"
                >
                  <span className="flex flex-wrap items-start gap-2">
                    <span className="min-w-0 flex-1 text-sm font-medium">
                      {highlight(h.title, h.terms || []).map((p, i) =>
                        p.hit ? (
                          <mark key={i} className="bg-primary/25 text-fg">
                            {p.text}
                          </mark>
                        ) : (
                          <span key={i}>{p.text}</span>
                        ),
                      )}
                    </span>
                    {h.tier ? <TierBadge tier={h.tier as never} /> : null}
                  </span>
                  <span className="mt-1 block text-xs text-muted">{h.subject}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!q ? (
        <EmptyState title="Search across all subjects">
          Everything is stored locally — no account, no server. Try a topic from your syllabus.
        </EmptyState>
      ) : null}
    </div>
  )
}
