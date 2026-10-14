import { useMemo } from 'react'
import type { SubjectDetail, Tier } from '../lib/types'
import { TIERS, TIER_RANK } from '../lib/tiers'
import { yearSpan, marksLabel } from '../lib/format'
import { useStore } from '../store/useStore'
import { IconPrint } from './icons'

interface Props {
  detail: SubjectDetail
  segmentId: string | null
  tiers: Tier[]
  includeNotes?: boolean
}

export default function RevisionSheet({ detail, segmentId, tiers, includeNotes = true }: Props) {
  const notes = useStore((s) => s.notes)
  const segment = segmentId ? detail.segments.find((s) => s.id === segmentId) : null

  const clusters = useMemo(() => {
    const list = detail.clusters.filter((c) => tiers.includes(c.tier) && c.type !== 'quickfact')
    return list
      .map((c) => ({
        c,
        years: segment ? c.yearsBySegment[segment.id] || [] : c.yearsAsked,
      }))
      .filter((x) => x.years.length > 0)
      .sort(
        (a, b) =>
          TIER_RANK[a.c.tier] - TIER_RANK[b.c.tier] ||
          b.years.length - a.years.length ||
          a.c.title.localeCompare(b.c.title),
      )
  }, [detail, segment, tiers])

  return (
    <div>
      <div className="no-print mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Revision sheet</h2>
          <p className="text-sm text-muted">
            {detail.name}
            {segment ? ` · ${segment.schemeLabel}` : ''} · {tiers.map((t) => TIERS[t].label).join(' + ')}
          </p>
        </div>
        <button className="btn-primary" onClick={() => window.print()}>
          <IconPrint width={16} height={16} /> Print / Save PDF
        </button>
      </div>

      <ol className="flex flex-col gap-3">
        {clusters.map(({ c, years }, idx) => (
          <li key={c.id} className="card p-3 print-only:border print-only:border-black">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold tabular-nums">{idx + 1}.</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{c.title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {TIERS[c.tier].label} · asked in {yearSpan(years)}
                  {marksLabel(c.marks) ? ` · ${marksLabel(c.marks)}` : ''}
                </p>
                {includeNotes && notes[c.id] ? (
                  <p className="mt-1 border-l-2 border-line/20 pl-2 text-xs italic text-muted">
                    Note: {notes[c.id]}
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-6 text-xs text-muted">
        Generated from {detail.name} past papers. Unofficial — verify with your syllabus.
      </p>
    </div>
  )
}
