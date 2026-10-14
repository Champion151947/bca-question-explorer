import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { runSearch, type SearchHit } from '../lib/search'
import { IconSearch, IconClose } from './icons'
import { Spinner } from './ui'

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (open) {
      setQ('')
      setHits([])
      const t = setTimeout(() => inputRef.current?.focus(), 30)
      return () => clearTimeout(t)
    }
    return undefined
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    let alive = true
    setLoading(true)
    const t = setTimeout(() => {
      runSearch(q, 20)
        .then((h) => {
          if (alive) setHits(h)
        })
        .finally(() => {
          if (alive) setLoading(false)
        })
    }, 140)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [q, open])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  function go(hit: SearchHit) {
    onClose()
    navigate(`/subject/${hit.subjectSlug}?focus=${encodeURIComponent(hit.id)}`)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[10vh]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="card w-full max-w-xl overflow-hidden p-0"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Search questions"
      >
        <div className="flex items-center gap-2 border-b border-line/10 px-3">
          <IconSearch className="text-muted" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a topic, e.g. deadlock, normalization…"
            className="w-full bg-transparent py-3 text-base outline-none placeholder:text-muted"
            aria-label="Search questions"
          />
          <button className="btn-ghost !px-2" onClick={onClose} aria-label="Close search">
            <IconClose />
          </button>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {loading && !hits.length ? (
            <div className="p-3">
              <Spinner label="Searching…" />
            </div>
          ) : hits.length === 0 ? (
            <p className="p-3 text-sm text-muted">
              {q.trim() ? 'No matches. Try a simpler word.' : 'Type to search across all subjects.'}
            </p>
          ) : (
            <ul>
              {hits.map((h) => (
                <li key={h.id}>
                  <button
                    onClick={() => go(h)}
                    className="flex w-full flex-col gap-0.5 rounded-xl px-3 py-2 text-left hover:bg-surface2"
                  >
                    <span className="text-sm font-medium">{h.title}</span>
                    <span className="text-xs text-muted">{h.subject}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-line/10 px-3 py-2 text-right text-[11px] text-muted">
          Esc to close · Enter to open
        </div>
      </div>
    </div>
  )
}
