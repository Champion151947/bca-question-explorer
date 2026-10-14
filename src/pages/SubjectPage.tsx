import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import ClusterCard from '../components/ClusterCard'
import HeatmapView, { focusCluster } from '../components/HeatmapView'
import Flashcards from '../components/Flashcards'
import RevisionSheet from '../components/RevisionSheet'
import { EmptyState, Spinner, TierBadge } from '../components/ui'
import { IconArrowLeft, IconWarning, IconSearch } from '../components/icons'
import { useAsync } from '../lib/useAsync'
import { loadSubject } from '../lib/data'
import { yearSpan, plural } from '../lib/format'
import { TIER_RANK, TIERS, TIER_ORDER } from '../lib/tiers'
import { lastNightList, daysUntil, planTarget } from '../lib/planner'
import { useStore } from '../store/useStore'
import type { Cluster, Segment, Tier } from '../lib/types'

type Tab = 'questions' | 'pattern' | 'cards' | 'sheet'

export default function SubjectPage() {
  const { slug = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const focus = params.get('focus')
  const tabParam = params.get('tab')
  const initialTab: Tab = (['questions', 'pattern', 'cards', 'sheet'] as const).includes(
    tabParam as Tab,
  )
    ? (tabParam as Tab)
    : 'questions'

  const { data: detail, error, loading } = useAsync(() => loadSubject(slug), [slug])
  const addLastSubject = useStore((s) => s.addLastSubject)
  useEffect(() => {
    if (slug) addLastSubject(slug)
  }, [slug, addLastSubject])

  const examDate = useStore((s) => s.examDates[slug])
  const setExamDate = useStore((s) => s.setExamDate)

  const [tab, setTab] = useState<Tab>(initialTab)
  const [segmentId, setSegmentId] = useState<string | 'all'>('all')
  const [tiers, setTiers] = useState<Tier[]>(['must', 'high', 'frequent'])
  const [showOnce, setShowOnce] = useState(false)
  const [q, setQ] = useState('')
  const [sortBy, setSortBy] = useState<'frequency' | 'year' | 'alpha'>('frequency')

  function changeTab(t: Tab) {
    setTab(t)
    const next = new URLSearchParams(params)
    if (t === 'questions') next.delete('tab')
    else next.set('tab', t)
    setParams(next, { replace: true })
  }

  useEffect(() => {
    setSegmentId('all')
    setQ('')
    setShowOnce(false)
  }, [slug])

  useEffect(() => {
    setTab(initialTab)
  }, [slug, tabParam]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (detail && focus) {
      setTab('questions')
      const t = setTimeout(() => focusCluster(focus), 120)
      return () => clearTimeout(t)
    }
    return undefined
  }, [detail, focus])

  const segment: Segment | null =
    detail && segmentId !== 'all' ? detail.segments.find((s) => s.id === segmentId) || null : null
  const segmentLabel = segment ? `${segment.schemeLabel}` : null

  const activeTiers: Tier[] = showOnce ? [...tiers, 'once'] : tiers

  const visible = useMemo(() => {
    if (!detail) return []
    return filterClusters(detail.clusters, {
      segmentId: segmentId === 'all' ? null : segmentId,
      tiers: activeTiers,
      query: q,
      sortBy,
    })
  }, [detail, segmentId, activeTiers, q, sortBy])

  if (loading) return <div className="py-10"><Spinner label="Loading subject…" /></div>
  if (error) return <EmptyState title="Subject not found">{error.message}</EmptyState>
  if (!detail) return null

  const nights = lastNightList(detail, useStore.getState().mastered)
  const days = daysUntil(examDate)
  const target = planTarget(nights.length, days)

  return (
    <div className="flex flex-col gap-6">
      <Link to="/" className="no-print inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <IconArrowLeft width={16} height={16} /> All subjects
      </Link>

      <header className="rounded-2xl border border-line/10 bg-surface p-5">
        <h1 className="text-2xl font-bold">{detail.name}</h1>
        <p className="mt-1 text-sm text-muted">
          Sem {detail.semesters.join(', ') || '—'} · {plural(detail.paperCount, 'paper')} ·{' '}
          {plural(detail.questionCount, 'question')} · {yearSpan(detail.years)}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {TIER_ORDER.map((t) => (
            <span key={t} className="flex items-center gap-1 text-xs text-muted">
              <TierBadge tier={t} showLabel={false} />
              {detail.counts[t]}
            </span>
          ))}
        </div>

        {detail.limited ? (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-high">
            <IconWarning width={14} height={14} /> Few papers available — repeat counts are less
            reliable here.
          </p>
        ) : null}
        {detail.schemeUnknownYears.length ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
            <IconWarning width={14} height={14} /> Scheme unclear for{' '}
            {detail.schemeUnknownYears.join(', ')} — counted under the subject, not a scheme.
          </p>
        ) : null}

        <div className="no-print mt-4 flex flex-wrap items-center gap-2 text-sm">
          <label className="text-muted" htmlFor="examdate">
            Exam date (optional)
          </label>
          <input
            id="examdate"
            type="date"
            value={examDate || ''}
            onChange={(e) => setExamDate(slug, e.target.value)}
            className="rounded-lg border border-line/15 bg-surface2/60 px-2 py-1.5 text-sm"
          />
          {days != null ? (
            <span className="text-xs text-muted">
              {days > 0 ? `${days} day${days === 1 ? '' : 's'} to go` : 'Exam day'} · revise{' '}
              <strong className="text-fg">{target}</strong> topics/day
            </span>
          ) : null}
        </div>
      </header>

      {detail.segments.length > 1 ? (
        <div className="no-print flex flex-wrap gap-1.5">
          <Pill active={segmentId === 'all'} onClick={() => setSegmentId('all')}>
            All syllabi
          </Pill>
          {detail.segments.map((s) => (
            <Pill key={s.id} active={segmentId === s.id} onClick={() => setSegmentId(s.id)}>
              {s.schemeLabel} · {s.years.length} yrs
            </Pill>
          ))}
        </div>
      ) : null}

      <div className="no-print flex flex-wrap gap-1">
        {(['questions', 'pattern', 'cards', 'sheet'] as const).map((t) => (
          <Pill key={t} active={tab === t} onClick={() => changeTab(t)}>
            {t === 'questions' ? 'Questions' : t === 'pattern' ? 'Pattern' : t === 'cards' ? 'Cards' : 'Revision sheet'}
          </Pill>
        ))}
      </div>

      {tab === 'questions' ? (
        <>
          {days != null && nights.length > 0 ? (
            <div className="rounded-2xl border border-line/10 bg-surface2/40 p-4">
              <h2 className="text-sm font-semibold">Last-night mode</h2>
              <p className="text-xs text-muted">
                {nights.length} Must/High topics still unmastered.
                {days > 0 ? ` Do ${target} per day.` : ' Go through all of them.'}
              </p>
            </div>
          ) : null}

          <div className="no-print flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-line/15 bg-surface2/60 px-3 py-2">
              <IconSearch width={16} height={16} className="text-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Filter questions…"
                className="w-full bg-transparent text-sm outline-none sm:w-52"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {(['must', 'high', 'frequent'] as const).map((t) => (
                <Pill
                  key={t}
                  active={tiers.includes(t)}
                  onClick={() =>
                    setTiers((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))
                  }
                >
                  {TIERS[t].label}
                </Pill>
              ))}
              <Pill active={showOnce} onClick={() => setShowOnce((v) => !v)}>
                Show asked-once
              </Pill>
            </div>
            <div className="ml-auto flex items-center gap-1">
              {(['frequency', 'year', 'alpha'] as const).map((s) => (
                <Pill key={s} active={sortBy === s} onClick={() => setSortBy(s)}>
                  {s === 'frequency' ? 'Most repeated' : s === 'year' ? 'Newest' : 'A–Z'}
                </Pill>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <EmptyState title="Nothing matches">
              Clear the filters, or enable “Show asked-once”.
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-3">
              {visible.map((c) => (
                <ClusterCard
                  key={c.id}
                  cluster={c}
                  subjectName={detail.name}
                  subjectSlug={detail.slug}
                  segmentLabel={segmentLabel}
                  lastYear={detail.yearEnd ?? undefined}
                  focused={focus === c.id}
                />
              ))}
            </div>
          )}
        </>
      ) : null}

      {tab === 'pattern' ? <HeatmapView detail={detail} segmentId={segmentId === 'all' ? null : segmentId} /> : null}
      {tab === 'cards' ? <Flashcards clusters={visible.filter((c) => c.tier !== 'once')} /> : null}
      {tab === 'sheet' ? (
        <RevisionSheet
          detail={detail}
          segmentId={segmentId === 'all' ? null : segmentId}
          tiers={showOnce ? activeTiers : (activeTiers.filter((t) => t !== 'once') as Tier[])}
        />
      ) : null}
    </div>
  )
}

interface FilterOpts {
  segmentId: string | null
  tiers: Tier[]
  query: string
  sortBy: 'frequency' | 'year' | 'alpha'
}

export function filterClusters(clusters: Cluster[], opts: FilterOpts): Cluster[] {
  const query = opts.query.trim().toLowerCase()
  const out: Cluster[] = []
  for (const c of clusters) {
    const years = opts.segmentId ? c.yearsBySegment[opts.segmentId] || [] : c.yearsAsked
    if (years.length === 0) continue
    const tier = opts.segmentId ? c.tierBySegment[opts.segmentId] || c.tier : c.tier
    if (!opts.tiers.includes(tier)) continue
    if (query && !c.title.toLowerCase().includes(query) && !c.rawMain.toLowerCase().includes(query))
      continue
    out.push(c)
  }
  if (opts.sortBy === 'alpha') out.sort((a, b) => a.title.localeCompare(b.title))
  else if (opts.sortBy === 'year')
    out.sort(
      (a, b) =>
        Math.max(...(opts.segmentId ? b.yearsBySegment[opts.segmentId] || [] : b.yearsAsked)) -
        Math.max(...(opts.segmentId ? a.yearsBySegment[opts.segmentId] || [] : a.yearsAsked)),
    )
  else
    out.sort(
      (a, b) =>
        (opts.segmentId ? b.yearsBySegment[opts.segmentId] || [] : b.yearsAsked).length -
          (opts.segmentId ? a.yearsBySegment[opts.segmentId] || [] : a.yearsAsked).length ||
        TIER_RANK[tierOf(a, opts)] - TIER_RANK[tierOf(b, opts)] ||
        a.title.localeCompare(b.title),
    )
  return out
}

function tierOf(c: Cluster, opts: FilterOpts): Tier {
  return opts.segmentId ? c.tierBySegment[opts.segmentId] || c.tier : c.tier
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
