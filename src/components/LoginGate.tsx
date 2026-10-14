import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { AUTH_ENABLED, checkSession, login } from '../lib/auth'
import { resetDataCache } from '../lib/data'
import { config } from '../config'

type Status = 'checking' | 'locked' | 'unlocked'

export default function LoginGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>(AUTH_ENABLED ? 'checking' : 'unlocked')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!AUTH_ENABLED) return
    let alive = true
    checkSession().then((ok) => {
      if (alive) setStatus(ok ? 'unlocked' : 'locked')
    })
    const expired = () => {
      resetDataCache()
      setStatus('locked')
    }
    window.addEventListener('bca:auth-expired', expired)
    return () => {
      alive = false
      window.removeEventListener('bca:auth-expired', expired)
    }
  }, [])

  if (!AUTH_ENABLED || status === 'unlocked') return <>{children}</>

  if (status === 'checking') {
    return (
      <div className="grid min-h-screen place-items-center bg-bg text-muted">
        <span className="animate-pulse text-sm">Checking access…</span>
      </div>
    )
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!password || busy) return
    setBusy(true)
    setError('')
    const res = await login(password)
    setBusy(false)
    if (res.ok) {
      resetDataCache()
      setStatus('unlocked')
      window.location.reload()
    } else {
      setError(res.error || 'Wrong password')
      setPassword('')
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-bg px-4">
      <form onSubmit={submit} className="card w-full max-w-sm p-6">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary2 text-sm font-bold text-white">
            B
          </span>
          <div>
            <h1 className="font-display text-base font-bold leading-none">{config.shortName}</h1>
            <p className="mt-1 text-xs text-muted">Private question-paper access</p>
          </div>
        </div>

        <label className="block text-sm font-medium" htmlFor="access">
          Access code
        </label>
        <input
          id="access"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 w-full rounded-lg border border-line/20 bg-surface2 px-3 py-2 text-sm outline-none focus:border-primary"
          placeholder="Enter the access code"
        />

        {error && <p className="mt-2 text-sm text-must">{error}</p>}

        <button type="submit" className="btn-primary mt-4 w-full py-2" disabled={busy}>
          {busy ? 'Checking…' : 'Unlock'}
        </button>

        <p className="mt-4 text-xs text-muted">
          The papers are private and served only to approved students. Ask {config.authorName} for the
          code.
        </p>
      </form>
    </div>
  )
}
