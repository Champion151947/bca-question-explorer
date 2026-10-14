import { Link } from 'react-router-dom'
import type { SubjectSummary } from '../lib/types'
import { yearSpan, plural } from '../lib/format'
import { IconWarning } from './icons'

export default function SubjectCard({ subject }: { subject: SubjectSummary }) {
  const s = subject
  return (
    <Link
      to={`/subject/${s.slug}`}
      className="card block p-4 transition-colors hover:border-primary/40 focus-visible:border-primary"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-base font-bold leading-snug">{s.name}</h3>
        <span className="shrink-0 text-xs text-muted">{yearSpan(s.years)}</span>
      </div>

      <p className="mt-1 text-xs text-muted">
        Sem {s.semesters.join(', ') || '—'} · {plural(s.paperCount, 'paper')} ·{' '}
        {plural(s.questionCount, 'question')}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {s.mustCount > 0 ? (
          <span className="chip bg-must/12 text-must border-must/35">🔥 {s.mustCount} must</span>
        ) : null}
        {s.highCount > 0 ? (
          <span className="chip bg-high/12 text-high border-high/35">⚡ {s.highCount} high</span>
        ) : null}
        {s.frequentCount > 0 ? (
          <span className="chip bg-frequent/12 text-frequent border-frequent/35">
            📌 {s.frequentCount} frequent
          </span>
        ) : null}
        {s.mustCount + s.highCount + s.frequentCount === 0 ? (
          <span className="chip border-line/15 bg-surface2 text-muted">Only single-year questions</span>
        ) : null}
      </div>

      {s.hasMultipleSegments ? (
        <p className="mt-2 text-[11px] text-muted">CBCSS and FYUGP papers both included.</p>
      ) : null}
      {s.limited ? (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-high">
          <IconWarning width={13} height={13} /> Few papers — repeat counts are less reliable.
        </p>
      ) : null}
      {s.possibleReusedPapers ? (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
          <IconWarning width={13} height={13} /> A paper may have been used in two years.
        </p>
      ) : null}
    </Link>
  )
}
