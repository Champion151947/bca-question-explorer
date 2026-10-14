import { useEffect, useState } from 'react'
import type { Cluster } from '../lib/types'
import { TIERS } from '../lib/tiers'
import { marksLabel } from '../lib/format'
import { reportUrl } from '../lib/report'
import { useStore } from '../store/useStore'
import { TierBadge, YearChips } from './ui'
import {
  IconChevron,
  IconCopy,
  IconCheck,
  IconBookmark,
  IconFlag,
  IconWarning,
} from './icons'

interface Props {
  cluster: Cluster
  subjectName: string
  subjectSlug: string
  segmentLabel?: string | null
  lastYear?: number
  defaultOpen?: boolean
  focused?: boolean
}

export default function ClusterCard({
  cluster,
  subjectName,
  subjectSlug,
  segmentLabel,
  lastYear,
  defaultOpen = false,
  focused = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen || focused)
  const [showNote, setShowNote] = useState(false)

  const mastered = useStore((s) => !!s.mastered[cluster.id])
  const revise = useStore((s) => !!s.revise[cluster.id])
  const note = useStore((s) => s.notes[cluster.id] || '')
  const toggleMastered = useStore((s) => s.toggleMastered)
  const toggleRevise = useStore((s) => s.toggleRevise)
  const setNote = useStore((s) => s.setNote)

  const tier = TIERS[cluster.tier]
  const years = [...cluster.yearsAsked].sort((a, b) => b - a)
  const markText = marksLabel(cluster.marks)

  useEffect(() => {
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail === cluster.id) {
        setOpen(true)
        setTimeout(() => {
          document.getElementById(cluster.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 60)
      }
    }
    window.addEventListener('bca:focus', handler)
    return () => window.removeEventListener('bca:focus', handler)
  }, [cluster.id])

  function plainText(): string {
    const lines = [`${cluster.title}`, '']
    for (const v of cluster.variants) {
      lines.push(`• ${v.year ?? '—'}: ${v.text}`)
    }
    if (markText) lines.push('', `Marks: ${markText}`)
    lines.push(`Subject: ${subjectName}`)
    return lines.join('\n')
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(plainText())
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      id={cluster.id}
      className={`card scroll-mt-24 overflow-hidden transition-shadow ${
        focused ? 'ring-2 ring-primary/60' : ''
      } ${mastered ? 'opacity-70' : ''}`}
    >
      <div className="flex items-start gap-2 p-3 sm:p-4">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-start gap-3 text-left"
          aria-expanded={open}
        >
          <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${tier.dot}`} aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block font-medium leading-snug">
              {cluster.titleIsTopic && cluster.topicLabel ? cluster.topicLabel : cluster.title}
            </span>
            <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <span>
                {years.length} {years.length === 1 ? 'year' : 'years'}
              </span>
              {markText ? <span>· {markText}</span> : null}
              {cluster.type === 'quickfact' ? <span>· Quick fact</span> : null}
              {mastered ? <span className="text-primary">· Mastered</span> : null}
              {revise ? <span className="text-high">· To revise</span> : null}
              {note ? <span>· Has note</span> : null}
            </span>
          </span>
          <IconChevron
            className={`mt-1 shrink-0 text-muted transition-transform ${open ? '' : '-rotate-90'}`}
          />
        </button>
      </div>

      {open ? (
        <div className="border-t border-line/10 p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <TierBadge tier={cluster.tier} />
            <YearChips years={cluster.yearsAsked} lastYear={lastYear} />
          </div>

          {cluster.type === 'quickfact' ? (
            <p className="mb-3 rounded-xl bg-surface2/60 p-3 text-sm">{cluster.rawMain}</p>
          ) : (
            <ul className="mb-3 flex flex-col gap-2">
              {cluster.variants.map((v, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="w-10 shrink-0 pt-0.5 text-right text-xs tabular-nums text-muted">
                    {v.year ?? '—'}
                  </span>
                  <span className="min-w-0 flex-1">{v.text}</span>
                </li>
              ))}
            </ul>
          )}

          {cluster.mixedCluster ? (
            <p className="mb-2 flex items-start gap-2 text-xs text-muted">
              <IconWarning width={14} height={14} className="mt-0.5 shrink-0" />
              This entry groups a few closely-related questions. Open the years above to see each one.
            </p>
          ) : null}
          {cluster.mathGarbled ? (
            <p className="mb-2 text-xs text-muted">
              Some symbols may be garbled from the scanned paper.
            </p>
          ) : null}
          {cluster.truncated ? (
            <p className="mb-2 text-xs text-muted">Text may be clipped in the original scan.</p>
          ) : null}

          <div className="no-print mt-3 flex flex-wrap gap-2">
            <button
              className={`btn ${mastered ? 'border-transparent bg-primary text-white' : 'btn-soft'}`}
              onClick={() => toggleMastered(cluster.id)}
              aria-pressed={mastered}
            >
              <IconCheck width={16} height={16} />
              {mastered ? 'Mastered' : 'Mark mastered'}
            </button>
            <button
              className={`btn ${revise ? 'border-transparent bg-high/20 text-high' : 'btn-soft'}`}
              onClick={() => toggleRevise(cluster.id)}
              aria-pressed={revise}
            >
              <IconBookmark width={16} height={16} />
              {revise ? 'To revise' : 'Revise later'}
            </button>
            <button className="btn-ghost" onClick={copy} aria-label="Copy question text">
              <IconCopy width={16} height={16} />
              Copy
            </button>
            <button className="btn-ghost" onClick={() => setShowNote((n) => !n)}>
              {note ? 'Edit note' : 'Add note'}
            </button>
            <a
              className="btn-ghost"
              href={reportUrl({ subjectName, subjectSlug, segmentLabel, cluster })}
              target="_blank"
              rel="noopener noreferrer"
            >
              <IconFlag width={16} height={16} />
              Report
            </a>
          </div>

          {showNote ? (
            <div className="no-print mt-3">
              <label className="sr-only" htmlFor={`note-${cluster.id}`}>
                Your note
              </label>
              <textarea
                id={`note-${cluster.id}`}
                value={note}
                onChange={(e) => setNote(cluster.id, e.target.value)}
                rows={3}
                placeholder="Write a short note, mnemonic, or what to remember…"
                className="w-full rounded-xl border border-line/15 bg-surface2/60 p-3 text-sm outline-none focus:border-primary"
              />
              <p className="mt-1 text-[11px] text-muted">
                Saved on this device only. Export from Progress to keep it safe.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
