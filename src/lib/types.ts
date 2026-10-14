export type Tier = 'must' | 'high' | 'frequent' | 'once'
export type QType = 'descriptive' | 'quickfact'
export type Scheme = 'CBCSS' | 'FYUGP'

export interface Variant {
  year: number | null
  text: string
}

export interface Segment {
  id: string
  semester: number | null
  scheme: string
  schemeLabel: string
  years: number[]
  paperCount: number
  questionCount: number
  limited: boolean
  courses: string[]
}

export interface Keyword {
  term: string
  yearCount: number
}

export interface Cluster {
  id: string
  title: string
  titleIsTopic: boolean
  topicLabel: string | null
  mixedCluster: boolean
  relatedTerms: string[]
  type: QType
  mathGarbled: boolean
  truncated: boolean
  yearsAsked: number[]
  tier: Tier
  tierBySegment: Record<string, Tier>
  yearsBySegment: Record<string, number[]>
  variants: Variant[]
  marks: number | null
  marksKnown: boolean
  rawMain: string
  rawVariants: string[]
}

export interface SubjectDetail {
  slug: string
  name: string
  keys: string[]
  semesters: number[]
  schemes: string[]
  years: number[]
  yearStart: number | null
  yearEnd: number | null
  paperCount: number
  questionCount: number
  limited: boolean
  possibleReusedPapers: boolean
  schemeUnknownYears: number[]
  segments: Segment[]
  keywords: Keyword[]
  counts: { must: number; high: number; frequent: number; once: number }
  clusters: Cluster[]
}

export interface SubjectSummary {
  slug: string
  name: string
  semesters: number[]
  schemes: string[]
  years: number[]
  yearStart: number | null
  yearEnd: number | null
  paperCount: number
  questionCount: number
  clusterCount: number
  mustCount: number
  highCount: number
  frequentCount: number
  onceCount: number
  limited: boolean
  possibleReusedPapers: boolean
  hasMultipleSegments: boolean
  schemeUnknownYears: number[]
  topKeywords: string[]
}

export interface IndexTotals {
  subjects: number
  papers: number
  questions: number
  clusters: number
  papersText: number
  papersOcr: number
  needsReview: number
  yearStart: number | null
  yearEnd: number | null
  yearCount: number
}

export interface IndexFile {
  meta: {
    generatedAt: string
    mode: 'A' | 'B'
    totals: IndexTotals
    disclaimer: string
  }
  subjects: SubjectSummary[]
}

export interface SearchDoc {
  id: string
  subjectSlug: string
  subject: string
  title: string
  keywords: string
  tier: Tier | ''
  type: QType | 'subject'
}

export interface SearchFile {
  documents: SearchDoc[]
}
