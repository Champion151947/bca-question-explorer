import catalogJson from './catalog.json'

/**
 * Seed metadata from the project documentation (section 3.2 of the build spec).
 * This is a HINT layer only. The JSON/CSV data is authoritative; the build
 * script prints any mismatch between these numbers and the computed ones.
 */
export interface CatalogRow {
  /** Key of the matching subject in 04_website_data.json */
  json_key: string
  /** Canonical display name from the catalog */
  subject: string
  sem: number
  /** Scheme / syllabus segment hint, e.g. "CBCSS (2019)" */
  scheme: string
  codes: string[]
  papers: number
  questions: number
  year_start: number
  year_end: number
}

export interface PaperCountHint {
  total: number
  CBCSS: number
  FYUGP: number
}

export interface Catalog {
  paperCountsBySemester: Record<string, PaperCountHint>
  rows: CatalogRow[]
}

export const catalog = catalogJson as Catalog

export const catalogRows: CatalogRow[] = catalog.rows
export const paperCountsBySemester = catalog.paperCountsBySemester

/** Rows for a given data subject key (a key can have several rows/syllabi). */
export function catalogRowsForKey(key: string): CatalogRow[] {
  return catalogRows.filter((r) => r.json_key === key)
}
