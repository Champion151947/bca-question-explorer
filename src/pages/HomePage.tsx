import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SubjectCard from '../components/SubjectCard'
import { EmptyState, Spinner, SectionTitle } from '../components/ui'
import { IconSearch } from '../components/icons'
import { useAsync } from '../lib/useAsync'
import { loadIndex } from '../lib/data'
import { displayStats } from '../config'
import { useStore, type SchemeFilter } from '../store/useStore'

const SCHEMES: SchemeFilter[] = ['all', 'CBCSS', 'FYUGP']

export default function HomePage() {
  const { data: index, error, loading } = useAsync(() => loadIndex(), [])
  const semester = useStore((s) => s.semester)
  const setSemester = useStore((s) => s.setSemester)
  const scheme = useStore((s) => s.scheme)
  const setScheme = useStore((s) => s.setScheme)
  const role = useStore((s) => s.role)
  const [sort, setSort] = useState<'must' | 'name' | 'recent'>('must')

  const subjects = useMemo(() => {
    if (!index) return []
    let list = index.subjects
    if (semester !== 'all') list = list.filter((s) => s.semesters.includes(semester))
    if (scheme !== 'all') {
      list = list.filter((s) => s.schemes.some((x) => x.toUpperCase() === scheme))
    }
    const sorted = [...list]
    if (sort === 'must') sorted.sort((a, b) => b.mustCount - a.mustCount || a.name.localeCompare(b.name))
    else if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name))
    else sorted.sort((a, b) => (b.yearEnd ?? 0) - (a.yearEnd ?? 0) || a.name.localeCompare(b.name))
    return sorted
  }, [index, semester, scheme, sort])

  if (loading) return <div className="py-10"><Spinner label="Loading subjects…" /></div>
  if (error)
    return (
      <EmptyState title="Could not load data">
        {error.message}. If this is a fresh checkout, run <code>npm run data</code> first.
      </EmptyState>
    )
  if (!index) return null

  const t = index.meta.totals

  return (
    <div className="flex flex-col gap-6">
      <header className="hero relative overflow-hidden rounded-3xl p-6 text-white shadow-pop sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            Unofficial · Calicut University BCA
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight sm:text-4xl">
            See what keeps coming back in exams.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/85">
            Pick a subject and revise the questions that appear year after year — Must Study first.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Subjects" value={displayStats.subjects} />
            <Stat label="Question papers" value={displayStats.papers} />
            <Stat label="Questions" value={displayStats.questions.toLocaleString()} />
            <Stat label="Years" value={`${t.yearStart ?? '—'}–${t.yearEnd ?? '—'}`} />
          </div>
          <Link
            to="/search"
            className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-primary shadow-sm transition-transform hover:-translate-y-0.5"
          >
            <IconSearch width={16} height={16} /> Search any question
          </Link>
        </div>
      </header>

      <div className="no-print flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-muted">Sem</span>
          <Pill active={semester === 'all'} onClick={() => setSemester('all')}>
            All
          </Pill>
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <Pill key={s} active={semester === s} onClick={() => setSemester(s)}>
              {s}
            </Pill>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-muted">Scheme</span>
          {SCHEMES.map((sc) => (
            <Pill key={sc} active={scheme === sc} onClick={() => setScheme(sc)}>
              {sc === 'all' ? 'All' : sc}
            </Pill>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-muted">Sort</span>
          {(['must', 'name', 'recent'] as const).map((s) => (
            <Pill key={s} active={sort === s} onClick={() => setSort(s)}>
              {s === 'must' ? 'Must first' : s === 'name' ? 'A–Z' : 'Recent'}
            </Pill>
          ))}
        </div>
      </div>

      {role ? (
        <p className="text-xs text-muted">
          Showing {scheme === 'all' ? 'all schemes' : scheme}
          {semester !== 'all' ? ` · semester ${semester}` : ''}. Change in About.
        </p>
      ) : null}

      {subjects.length === 0 ? (
        <EmptyState title="No subjects match">Try a different semester or scheme filter.</EmptyState>
      ) : (
        <>
          <SectionTitle>
            {subjects.length} subject{subjects.length === 1 ? '' : 's'}
          </SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {subjects.map((s) => (
              <SubjectCard key={s.slug} subject={s} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 px-3 py-2.5 backdrop-blur">
      <div className="font-display text-xl font-extrabold tabular-nums">{value}</div>
      <div className="text-xs text-white/80">{label}</div>
    </div>
  )
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[36px] rounded-lg border px-3 py-1 text-sm transition-colors ${
        active
          ? 'border-primary/50 bg-primary/15 text-primary'
          : 'border-line/15 bg-surface text-muted hover:bg-surface2'
      }`}
    >
      {children}
    </button>
  )
}
