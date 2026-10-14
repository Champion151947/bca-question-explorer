export function yearSpan(years: number[] | undefined | null): string {
  if (!years || years.length === 0) return 'no papers'
  if (years.length === 1) return `${years[0]}`
  const sorted = [...years].sort((a, b) => a - b)
  const contiguous = sorted.every((y, i) => i === 0 || y === sorted[i - 1] + 1)
  if (contiguous) return `${sorted[0]}–${sorted[sorted.length - 1]}`
  return sorted.join(', ')
}

export function plural(n: number, word: string, pluralWord?: string): string {
  return `${n} ${n === 1 ? word : pluralWord || word + 's'}`
}

export function askedInYears(n: number): string {
  return `Asked in ${n} different ${n === 1 ? 'year' : 'years'}`
}

export function marksLabel(marks: number | null): string | null {
  if (marks == null) return null
  const rounded = Math.round(marks * 10) / 10
  return `${rounded} mark${rounded === 1 ? '' : 's'}`
}

export function pct(part: number, total: number): number {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

export function yearChipClass(year: number, lastYear: number): string {
  return year >= lastYear - 2
    ? 'bg-primary/15 text-primary border-primary/40'
    : 'bg-surface2 text-muted border-line/15'
}

export function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}
