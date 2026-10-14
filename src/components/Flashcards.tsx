import { useEffect, useMemo, useState } from 'react'
import type { Cluster } from '../lib/types'
import { marksLabel } from '../lib/format'
import { useStore } from '../store/useStore'
import { TierBadge, YearChips, EmptyState } from './ui'
import { IconChevron } from './icons'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function Flashcards({ clusters }: { clusters: Cluster[] }) {
  const [seed, setSeed] = useState(0)
  const deck = useMemo(() => shuffle(clusters), [clusters, seed])
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const mastered = useStore((s) => s.mastered)
  const toggleMastered = useStore((s) => s.toggleMastered)

  useEffect(() => setI(0), [seed, clusters])
  useEffect(() => setFlipped(false), [i])

  const card = deck[i]

  useEffect(() => {
    if (!card) return undefined
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault()
        setFlipped((f) => !f)
      } else if (e.key === 'ArrowRight') {
        setI((v) => Math.min(v + 1, deck.length - 1))
      } else if (e.key === 'ArrowLeft') {
        setI((v) => Math.max(v - 1, 0))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [card, deck.length])

  if (!clusters.length) {
    return <EmptyState title="No cards to show">This subject has no Must/High questions yet.</EmptyState>
  }
  if (!card) return null

  const mark = marksLabel(card.marks)

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={() => setFlipped((f) => !f)}
        className="card relative min-h-[240px] w-full max-w-xl p-6 text-left"
        aria-label={flipped ? 'Hide answer' : 'Show answer'}
      >
        <div className="mb-3 flex items-center justify-between">
          <TierBadge tier={card.tier} />
          <span className="text-xs text-muted">
            {i + 1} / {deck.length}
          </span>
        </div>
        {!flipped ? (
          <>
            <p className="font-display text-lg font-semibold leading-snug">{card.title}</p>
            <p className="mt-6 text-center text-xs text-muted">Tap to reveal answer</p>
          </>
        ) : (
          <>
            <YearChips years={card.yearsAsked} />
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {card.variants.slice(0, 3).map((v, idx) => (
                <li key={idx} className="text-muted">
                  <span className="font-medium text-fg">{v.year ?? '—'}:</span> {v.text}
                </li>
              ))}
            </ul>
            {mark ? <p className="mt-3 text-xs text-muted">{mark}</p> : null}
          </>
        )}
        {mastered[card.id] ? (
          <span className="absolute right-4 top-4 text-xs text-primary">Mastered</span>
        ) : null}
      </button>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button className="btn-soft" onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0}>
          <IconChevron className="rotate-90" width={16} height={16} /> Prev
        </button>
        <button
          className="btn-primary"
          onClick={() => toggleMastered(card.id)}
          aria-pressed={!!mastered[card.id]}
        >
          {mastered[card.id] ? 'Marked mastered' : 'Mark mastered'}
        </button>
        <button
          className="btn-soft"
          onClick={() => setI((v) => Math.min(deck.length - 1, v + 1))}
          disabled={i === deck.length - 1}
        >
          Next <IconChevron className="-rotate-90" width={16} height={16} />
        </button>
        <button className="btn-ghost" onClick={() => setSeed((s) => s + 1)}>
          Shuffle
        </button>
      </div>
      <p className="text-xs text-muted">Space to flip · arrow keys to move</p>
      <p className="sr-only" aria-live="polite">
        {flipped ? 'Answer shown' : 'Question shown'} for card {i + 1}
      </p>
    </div>
  )
}
