import type { ReactNode } from 'react'
import { TIERS } from '../lib/tiers'
import type { Tier } from '../lib/types'

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted" role="status" aria-live="polite">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line/30 border-t-primary" />
      {label}
    </div>
  )
}

export function TierBadge({ tier, showLabel = true }: { tier: Tier; showLabel?: boolean }) {
  const meta = TIERS[tier]
  return (
    <span className={`chip ${meta.chip}`} title={meta.hint}>
      <span aria-hidden>{meta.icon}</span>
      <span>{showLabel ? meta.label : meta.short}</span>
    </span>
  )
}

export function ProgressRing({
  value,
  size = 44,
  stroke = 4,
  label,
}: {
  value: number
  size?: number
  stroke?: number
  label?: string
}) {
  const clamped = Math.max(0, Math.min(100, value))
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (clamped / 100) * c
  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label || `${clamped}% complete`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--c-line) / 0.15)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgb(var(--c-primary))"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[10px] font-semibold tabular-nums text-muted">{clamped}%</span>
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon?: ReactNode
  title: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line/15 bg-surface2/40 px-6 py-12 text-center">
      {icon ? <div className="text-muted">{icon}</div> : null}
      <h3 className="text-lg font-semibold">{title}</h3>
      {children ? <div className="max-w-md text-sm text-muted">{children}</div> : null}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="card p-4">
      <div className="skeleton mb-3 h-5 w-2/3" />
      <div className="skeleton mb-2 h-4 w-1/3" />
      <div className="skeleton h-4 w-1/2" />
    </div>
  )
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export function YearChips({
  years,
  lastYear,
  highlight = true,
}: {
  years: number[]
  lastYear?: number
  highlight?: boolean
}) {
  const sorted = [...years].sort((a, b) => b - a)
  return (
    <div className="flex flex-wrap gap-1.5">
      {sorted.map((y) => {
        const recent = highlight && lastYear != null && y >= lastYear - 2
        return (
          <span
            key={y}
            className={`rounded-md border px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${
              recent ? 'border-primary/40 bg-primary/15 text-primary' : 'border-line/15 bg-surface2 text-muted'
            }`}
          >
            {y}
          </span>
        )
      })}
    </div>
  )
}

export function SectionTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="mb-3 text-xl font-bold">
      {children}
    </h2>
  )
}
