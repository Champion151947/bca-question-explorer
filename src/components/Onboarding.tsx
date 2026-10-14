import { useState } from 'react'
import { config } from '../config'
import { useStore, type Role, type SchemeFilter } from '../store/useStore'
import { IconSpark } from './icons'

const SEMESTERS = [1, 2, 3, 4, 5, 6]

export default function Onboarding() {
  const onboarded = useStore((s) => s.onboarded)
  const completeOnboarding = useStore((s) => s.completeOnboarding)
  const setSemester = useStore((s) => s.setSemester)
  const setScheme = useStore((s) => s.setScheme)

  const [role, setRole] = useState<Role | null>(null)
  const [step, setStep] = useState<1 | 2>(1)

  if (onboarded) return null

  function chooseRole(r: Role | null) {
    setRole(r)
    setStep(2)
  }

  function finish(sem: number | 'all') {
    const scheme: SchemeFilter = role === 'cbcss' ? 'CBCSS' : role === 'fyugp' ? 'FYUGP' : 'all'
    setScheme(scheme)
    setSemester(sem)
    completeOnboarding(role)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-bg/95 p-4">
      <div className="card w-full max-w-md p-6">
        <div className="mb-4 flex items-center gap-2 text-primary">
          <IconSpark />
          <span className="text-sm font-semibold">{config.siteName}</span>
        </div>

        {step === 1 ? (
          <>
            <h1 className="mb-1 text-2xl font-bold">Which one are you?</h1>
            <p className="mb-5 text-sm text-muted">
              This sets your default syllabus so the right papers show first. You can change it anytime.
            </p>
            <div className="flex flex-col gap-2">
              <button className="btn-soft !justify-start !py-3" onClick={() => chooseRole('cbcss')}>
                <span className="font-semibold">CBCSS student</span>
                <span className="text-xs text-muted">(most students up to 2024 admissions)</span>
              </button>
              <button className="btn-soft !justify-start !py-3" onClick={() => chooseRole('fyugp')}>
                <span className="font-semibold">FYUGP student</span>
                <span className="text-xs text-muted">(new scheme, 2024 admissions onwards)</span>
              </button>
              <button className="btn-ghost" onClick={() => chooseRole(null)}>
                Just browsing
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="mb-1 text-2xl font-bold">
              {role ? 'Which semester?' : 'Got a semester in mind?'}
            </h1>
            <p className="mb-5 text-sm text-muted">Pick one to jump straight to it.</p>
            <div className="grid grid-cols-3 gap-2">
              {SEMESTERS.map((s) => (
                <button key={s} className="btn-soft !py-3" onClick={() => finish(s)}>
                  Sem {s}
                </button>
              ))}
            </div>
            <button className="btn-ghost mt-3 w-full" onClick={() => finish('all')}>
              Show all semesters
            </button>
          </>
        )}

        <button className="mt-5 w-full text-xs text-muted underline" onClick={() => finish('all')}>
          Skip for now
        </button>
      </div>
    </div>
  )
}
