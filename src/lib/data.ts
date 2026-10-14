import type { IndexFile, SubjectDetail, SearchFile } from './types'

const BASE = import.meta.env.BASE_URL || './'
const DATA_BASE = import.meta.env.VITE_DATA_BASE || `${BASE}data/`
const dataUrl = (file: string) => `${DATA_BASE.replace(/\/?$/, '/')}${file}`

/** Thrown when the data server rejects an unauthenticated request (HTTP 401). */
export class AuthRequiredError extends Error {
  constructor() {
    super('Authentication required')
    this.name = 'AuthRequiredError'
  }
}

let indexPromise: Promise<IndexFile> | null = null
const subjectCache = new Map<string, Promise<SubjectDetail>>()
let searchPromise: Promise<SearchFile> | null = null

async function getJson<T>(file: string): Promise<T> {
  const res = await fetch(dataUrl(file), { cache: 'default', credentials: 'include' })
  if (res.status === 401) {
    window.dispatchEvent(new Event('bca:auth-expired'))
    throw new AuthRequiredError()
  }
  if (!res.ok) throw new Error(`Could not load ${file} (${res.status})`)
  return (await res.json()) as T
}

export function loadIndex(): Promise<IndexFile> {
  if (!indexPromise) indexPromise = getJson<IndexFile>('index.json')
  return indexPromise
}

export function loadSubject(slug: string): Promise<SubjectDetail> {
  let p = subjectCache.get(slug)
  if (!p) {
    p = getJson<SubjectDetail>(`${slug}.json`)
    subjectCache.set(slug, p)
  }
  return p
}

export function loadSearchIndex(): Promise<SearchFile> {
  if (!searchPromise) searchPromise = getJson<SearchFile>('search-index.json')
  return searchPromise
}

/** Clear cached data (used after sign-out / re-login). */
export function resetDataCache(): void {
  indexPromise = null
  searchPromise = null
  subjectCache.clear()
}
