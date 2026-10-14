import type { Cluster, SubjectDetail, Tier } from './types'

/** Clusters eligible for Last-Night Mode: Must Study + High. */
export function lastNightList(detail: SubjectDetail, mastered: Record<string, true>): Cluster[] {
  return detail.clusters.filter(
    (c) => (c.tier === 'must' || c.tier === 'high') && !mastered[c.id] && c.type !== 'quickfact',
  )
}

export function daysUntil(dateISO: string | null | undefined): number | null {
  if (!dateISO) return null
  const target = new Date(`${dateISO}T00:00:00`)
  if (Number.isNaN(target.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

export function planTarget(count: number, daysLeft: number | null): number {
  if (!count) return 0
  if (daysLeft == null || daysLeft <= 0) return count
  return Math.ceil(count / daysLeft)
}

export interface ProgressSummary {
  must: number
  high: number
  frequent: number
  once: number
  total: number
  mastered: number
  revise: number
}

export function tierCounts(clusters: Cluster[]): Record<Tier, number> {
  const c: Record<Tier, number> = { must: 0, high: 0, frequent: 0, once: 0 }
  for (const cl of clusters) c[cl.tier]++
  return c
}

export function progressFor(
  detail: SubjectDetail,
  mastered: Record<string, true>,
  revise: Record<string, true>,
): ProgressSummary {
  const counts = tierCounts(detail.clusters)
  let m = 0
  let r = 0
  for (const c of detail.clusters) {
    if (mastered[c.id]) m++
    if (revise[c.id]) r++
  }
  return {
    ...counts,
    total: detail.clusters.length,
    mastered: m,
    revise: r,
  }
}
