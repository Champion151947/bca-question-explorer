import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type ThemePref = 'dark' | 'light' | 'system'
export type Role = 'cbcss' | 'fyugp'
export type SchemeFilter = 'all' | 'CBCSS' | 'FYUGP'

export interface ExportBundle {
  app: 'bca-question-explorer'
  version: 1
  exportedAt: string
  mastered: Record<string, true>
  revise: Record<string, true>
  notes: Record<string, string>
  examDates: Record<string, string>
  lastSubjects: string[]
}

interface StoreState {
  theme: ThemePref
  role: Role | null
  onboarded: boolean
  semester: number | 'all'
  scheme: SchemeFilter
  mastered: Record<string, true>
  revise: Record<string, true>
  notes: Record<string, string>
  examDates: Record<string, string>
  lastSubjects: string[]
  showOnceSearch: boolean
  setTheme: (t: ThemePref) => void
  setRole: (r: Role | null) => void
  completeOnboarding: (r: Role | null) => void
  setSemester: (s: number | 'all') => void
  setScheme: (s: SchemeFilter) => void
  toggleMastered: (id: string) => void
  toggleRevise: (id: string) => void
  setNote: (id: string, text: string) => void
  setExamDate: (slug: string, date: string) => void
  addLastSubject: (slug: string) => void
  toggleShowOnceSearch: () => void
  clearProgress: () => void
  exportBundle: () => string
  importBundle: (json: string) => { ok: boolean; error?: string }
}

export function effectiveTheme(pref: ThemePref): 'dark' | 'light' {
  if (pref === 'system') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }
  return pref
}

export function applyTheme(pref: ThemePref) {
  const theme = effectiveTheme(pref)
  document.documentElement.setAttribute('data-theme', theme)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0B1120' : '#2563EB')
  try {
    localStorage.setItem('bca.theme.v2', pref)
  } catch {
    /* ignore */
  }
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      role: null,
      onboarded: false,
      semester: 'all',
      scheme: 'all',
      mastered: {},
      revise: {},
      notes: {},
      examDates: {},
      lastSubjects: [],
      showOnceSearch: false,
      setTheme: (t) => {
        applyTheme(t)
        set({ theme: t })
      },
      setRole: (r) => set({ role: r }),
      completeOnboarding: (r) => set({ onboarded: true, role: r }),
      setSemester: (s) => set({ semester: s }),
      setScheme: (s) => set({ scheme: s }),
      toggleMastered: (id) =>
        set((st) => {
          const mastered = { ...st.mastered }
          if (mastered[id]) delete mastered[id]
          else mastered[id] = true
          const revise = { ...st.revise }
          delete revise[id]
          return { mastered, revise }
        }),
      toggleRevise: (id) =>
        set((st) => {
          const revise = { ...st.revise }
          if (revise[id]) delete revise[id]
          else revise[id] = true
          const mastered = { ...st.mastered }
          delete mastered[id]
          return { revise, mastered }
        }),
      setNote: (id, text) =>
        set((st) => {
          const notes = { ...st.notes }
          if (text.trim()) notes[id] = text
          else delete notes[id]
          return { notes }
        }),
      setExamDate: (slug, date) =>
        set((st) => {
          const examDates = { ...st.examDates }
          if (date) examDates[slug] = date
          else delete examDates[slug]
          return { examDates }
        }),
      addLastSubject: (slug) =>
        set((st) => ({
          lastSubjects: [slug, ...st.lastSubjects.filter((s) => s !== slug)].slice(0, 3),
        })),
      toggleShowOnceSearch: () => set((st) => ({ showOnceSearch: !st.showOnceSearch })),
      clearProgress: () => set({ mastered: {}, revise: {}, notes: {}, examDates: {} }),
      exportBundle: () => {
        const st = get()
        const bundle: ExportBundle = {
          app: 'bca-question-explorer',
          version: 1,
          exportedAt: new Date().toISOString(),
          mastered: st.mastered,
          revise: st.revise,
          notes: st.notes,
          examDates: st.examDates,
          lastSubjects: st.lastSubjects,
        }
        return JSON.stringify(bundle, null, 2)
      },
      importBundle: (json) => {
        try {
          const data = JSON.parse(json) as Partial<ExportBundle>
          if (!data || typeof data !== 'object') return { ok: false, error: 'Not a valid file.' }
          set({
            mastered: data.mastered || {},
            revise: data.revise || {},
            notes: data.notes || {},
            examDates: data.examDates || {},
            lastSubjects: Array.isArray(data.lastSubjects) ? data.lastSubjects.slice(0, 3) : [],
          })
          return { ok: true }
        } catch (e) {
          return { ok: false, error: (e as Error).message }
        }
      },
    }),
    {
      name: 'bca.state',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted, version) => {
        const state = (persisted || {}) as Partial<StoreState>
        // v2: the site switched to a white/blue default — move existing users to light once.
        if (version < 2) state.theme = 'light'
        return state as StoreState
      },
      partialize: (st) => ({
        theme: st.theme,
        role: st.role,
        onboarded: st.onboarded,
        semester: st.semester,
        scheme: st.scheme,
        mastered: st.mastered,
        revise: st.revise,
        notes: st.notes,
        examDates: st.examDates,
        lastSubjects: st.lastSubjects,
        showOnceSearch: st.showOnceSearch,
      }),
    },
  ),
)

/** Whether a cluster id is mastered / marked for revision. */
export function useIsMastered(id: string) {
  return useStore((s) => !!s.mastered[id])
}
export function useIsRevise(id: string) {
  return useStore((s) => !!s.revise[id])
}
