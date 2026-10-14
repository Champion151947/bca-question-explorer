import { useMemo } from 'react'
import type { SubjectDetail } from '../lib/types'
import { buildHeatmap } from '../lib/heatmap'
import { TIERS } from '../lib/tiers'
import { EmptyState } from './ui'

export function focusCluster(id: string) {
  window.dispatchEvent(new CustomEvent('bca:focus', { detail: id }))
}

export default function HeatmapView({
  detail,
  segmentId,
}: {
  detail: SubjectDetail
  segmentId: string | null
}) {
  const { columns, hasPaper, rows } = useMemo(
    () => buildHeatmap(detail, segmentId),
    [detail, segmentId],
  )

  if (!columns.length || !rows.length) {
    return (
      <EmptyState title="Not enough data for a pattern view">
        This subject has too few papers to show a year-by-year grid.
      </EmptyState>
    )
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted">
        <span>Each dot means the topic was asked that year.</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-line/15" /> not asked
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line/10">
        <table className="min-w-max border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 border-b border-line/10 bg-surface px-3 py-2 text-left text-xs font-semibold text-muted">
                Topic
              </th>
              {columns.map((y, i) => (
                <th
                  key={y}
                  className={`border-b border-line/10 bg-surface px-2 py-2 text-center text-xs font-medium tabular-nums ${
                    hasPaper[i] ? 'text-muted' : 'text-muted/35'
                  }`}
                >
                  {y}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="group">
                <th
                  scope="row"
                  className="sticky left-0 z-10 max-w-[240px] border-b border-line/10 bg-surface px-3 py-1.5 text-left font-normal"
                >
                  <button
                    onClick={() => focusCluster(r.id)}
                    className="flex w-full items-center gap-2 text-left hover:text-primary"
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${TIERS[r.tier].dot}`} />
                    <span className="truncate">{r.label}</span>
                  </button>
                </th>
                {columns.map((y, i) => (
                  <td
                    key={y}
                    className={`border-b border-line/10 px-2 py-1.5 text-center ${
                      hasPaper[i] ? '' : 'bg-surface2/40'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 rounded-full align-middle ${
                        r.cells[i] ? TIERS[r.tier].dot : hasPaper[i] ? 'bg-line/10' : 'bg-transparent'
                      }`}
                      title={`${r.label} — ${y}${r.cells[i] ? '' : ' (not asked)'}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
