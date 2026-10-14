import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, ProgressRing, Spinner } from '../components/ui'
import { useAsync } from '../lib/useAsync'
import { loadIndex } from '../lib/data'
import { pct } from '../lib/format'
import { useStore } from '../store/useStore'

export default function ProgressPage() {
  const { data: index, loading } = useAsync(() => loadIndex(), [])
  const mastered = useStore((s) => s.mastered)
  const revise = useStore((s) => s.revise)
  const notes = useStore((s) => s.notes)
  const lastSubjects = useStore((s) => s.lastSubjects)

  const bySlug = useMemo(() => {
    const map: Record<string, { mastered: number; revise: number; notes: number }> = {}
    const touch = (slug: string) => (map[slug] ||= { mastered: 0, revise: 0, notes: 0 })
    for (const id of Object.keys(mastered)) touch(slugOf(id)).mastered++
    for (const id of Object.keys(revise)) touch(slugOf(id)).revise++
    for (const id of Object.keys(notes)) touch(slugOf(id)).notes++
    return map
  }, [mastered, revise, notes])

  const nameOf = useMemo(() => {
    const m: Record<string, { name: string; clusterCount: number }> = {}
    index?.subjects.forEach((s) => (m[s.slug] = { name: s.name, clusterCount: s.clusterCount }))
    return m
  }, [index])

  const rows = Object.entries(bySlug).sort(
    (a, b) => b[1].mastered + b[1].revise - (a[1].mastered + a[1].revise),
  )

  const totalMastered = Object.keys(mastered).length
  const totalRevise = Object.keys(revise).length
  const totalNotes = Object.keys(notes).length

  if (loading) return <div className="py-10"><Spinner label="Loading progress…" /></div>

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Progress</h1>
        <p className="mt-1 text-muted">
          Saved on this device. Export a backup from <Link to="/tools" className="link">Tools</Link>.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Big label="Mastered" value={totalMastered} />
        <Big label="To revise" value={totalRevise} />
        <Big label="Notes" value={totalNotes} />
      </div>

      {lastSubjects.length ? (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
            Jump back in
          </h2>
          <div className="flex flex-wrap gap-2">
            {lastSubjects.map((slug) => (
              <Link key={slug} to={`/subject/${slug}`} className="btn-soft">
                {nameOf[slug]?.name || slug}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState title="Nothing tracked yet">
          Open a subject, mark a few questions as mastered or “to revise”, and they will show up here.
        </EmptyState>
      ) : (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
            By subject
          </h2>
          <ul className="flex flex-col gap-2">
            {rows.map(([slug, c]) => {
              const info = nameOf[slug]
              const total = info?.clusterCount || 0
              return (
                <li key={slug}>
                  <Link
                    to={`/subject/${slug}`}
                    className="card flex items-center gap-4 p-3 hover:border-primary/40"
                  >
                    <ProgressRing value={pct(c.mastered, total)} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{info?.name || slug}</div>
                      <div className="text-xs text-muted">
                        {c.mastered} mastered
                        {total ? ` of ${total}` : ''} · {c.revise} to revise
                        {c.notes ? ` · ${c.notes} note${c.notes === 1 ? '' : 's'}` : ''}
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}

function slugOf(id: string): string {
  const i = id.indexOf(':')
  return i === -1 ? id : id.slice(0, i)
}

function Big({ label, value }: { label: string; value: number }) {
  return (
    <div className="card px-3 py-4 text-center">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  )
}
