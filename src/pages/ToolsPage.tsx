import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { IconDownload, IconUpload, IconWarning } from '../components/icons'

export default function ToolsPage() {
  const exportBundle = useStore((s) => s.exportBundle)
  const importBundle = useStore((s) => s.importBundle)
  const clearProgress = useStore((s) => s.clearProgress)
  const mastered = useStore((s) => s.mastered)
  const revise = useStore((s) => s.revise)
  const notes = useStore((s) => s.notes)

  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const counts = {
    mastered: Object.keys(mastered).length,
    revise: Object.keys(revise).length,
    notes: Object.keys(notes).length,
  }

  function download() {
    const json = exportBundle()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bca-progress-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMsg('Backup downloaded.')
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const res = importBundle(text)
    setMsg(res.ok ? 'Progress restored.' : `Could not read the file: ${res.error}`)
    if (fileRef.current) fileRef.current.value = ''
  }

  function clear() {
    if (window.confirm('Delete all progress, notes and exam dates on this device? This cannot be undone.'))
      clearProgress()
    setMsg('Progress cleared.')
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">Tools</h1>
        <p className="mt-1 text-muted">
          Your progress lives only in this browser. Back it up before clearing site data or switching
          devices.
        </p>
      </header>

      <section className="card p-4">
        <h2 className="text-lg font-bold">Your progress</h2>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          <Box label="Mastered" value={counts.mastered} />
          <Box label="To revise" value={counts.revise} />
          <Box label="Notes" value={counts.notes} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-primary" onClick={download}>
            <IconDownload width={16} height={16} /> Export backup
          </button>
          <button className="btn-soft" onClick={() => fileRef.current?.click()}>
            <IconUpload width={16} height={16} /> Import backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={onFile}
            className="hidden"
            aria-label="Import progress file"
          />
        </div>
        {msg ? <p className="mt-3 text-sm text-primary">{msg}</p> : null}
      </section>

      <section className="card p-4">
        <h2 className="text-lg font-bold">Clear everything</h2>
        <p className="mt-1 text-sm text-muted">
          Removes mastered marks, revision list, notes and exam dates from this device. Your export
          file is not affected.
        </p>
        <button className="btn-soft mt-3 !text-high" onClick={clear}>
          <IconWarning width={16} height={16} /> Clear my progress
        </button>
      </section>

      <section className="card p-4">
        <h2 className="text-lg font-bold">Revision sheet &amp; flashcards</h2>
        <p className="mt-1 text-sm text-muted">
          Open any subject to print a revision sheet or study with flashcards. See the{' '}
          <Link to="/progress" className="link">
            Progress
          </Link>{' '}
          page to jump back into the subjects you were studying.
        </p>
      </section>
    </div>
  )
}

function Box({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-surface2/60 px-3 py-3">
      <div className="text-xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  )
}
