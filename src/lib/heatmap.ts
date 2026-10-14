import type { Cluster, SubjectDetail, Tier } from './types'
import { TIER_RANK } from './tiers'

export interface HeatRow {
  id: string
  label: string
  tier: Tier
  cells: boolean[]
  years: number[]
}

export interface HeatmapData {
  columns: number[]
  hasPaper: boolean[]
  rows: HeatRow[]
}

/**
 * Build a topic-by-year pattern grid.
 * - `segmentId` null = "All syllabi" (uses each cluster's overall years).
 * - Columns span a contiguous year range; years without a paper are greyed.
 */
export function buildHeatmap(detail: SubjectDetail, segmentId: string | null): HeatmapData {
  const segment = segmentId ? detail.segments.find((s) => s.id === segmentId) || null : null

  const paperYears = segment
    ? segment.years
    : [...detail.years].sort((a, b) => a - b)

  const columns = paperYears.length
    ? range(paperYears[0], paperYears[paperYears.length - 1])
    : []
  const hasPaper = columns.map((y) => paperYears.includes(y))

  const rows: HeatRow[] = []
  for (const c of detail.clusters) {
    const years = segment ? c.yearsBySegment[segment.id] || [] : c.yearsAsked
    const relevant = years.filter((y) => columns.includes(y))
    if (relevant.length === 0) continue
    rows.push({
      id: c.id,
      label: clusterLabel(c),
      tier: segment ? c.tierBySegment[segment.id] || c.tier : c.tier,
      years: relevant,
      cells: columns.map((y) => relevant.includes(y)),
    })
  }

  rows.sort(
    (a, b) =>
      TIER_RANK[a.tier] - TIER_RANK[b.tier] ||
      b.years.length - a.years.length ||
      a.label.localeCompare(b.label),
  )

  return { columns, hasPaper, rows }
}

export function clusterLabel(c: Cluster): string {
  return c.titleIsTopic && c.topicLabel ? c.topicLabel : c.title
}

function range(start: number, end: number): number[] {
  const out: number[] = []
  for (let y = start; y <= end; y++) out.push(y)
  return out
}
