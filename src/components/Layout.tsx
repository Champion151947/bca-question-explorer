import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { config } from '../config'
import Onboarding from './Onboarding'
import ThemeToggle from './ThemeToggle'
import CommandPalette from './CommandPalette'
import {
  IconHome,
  IconSearch,
  IconTools,
  IconProgress,
  IconInfo,
} from './icons'

const NAV = [
  { to: '/', label: 'Semesters', icon: IconHome, end: true },
  { to: '/search', label: 'Search', icon: IconSearch },
  { to: '/tools', label: 'Tools', icon: IconTools },
  { to: '/progress', label: 'Progress', icon: IconProgress },
  { to: '/about', label: 'About', icon: IconInfo },
]

const BOTTOM = [NAV[0], NAV[1], NAV[2], NAV[3]]

export default function Layout() {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <header className="glass no-print sticky top-0 z-40 border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-3 sm:px-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-left"
            aria-label={`${config.siteName} home`}
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-primary2 text-sm font-bold text-white shadow-sm">
              B
            </span>
            <span className="font-display text-base font-bold leading-none">
              {config.shortName}
            </span>
          </button>

          <button
            onClick={() => setPaletteOpen(true)}
            className="ml-auto flex items-center gap-2 rounded-xl border border-line/10 bg-surface2/60 px-3 py-2 text-sm text-muted hover:bg-surface2 sm:w-64"
          >
            <IconSearch width={16} height={16} />
            <span className="hidden sm:inline">Search questions…</span>
            <kbd className="ml-auto hidden rounded border border-line/15 bg-surface px-1.5 text-[10px] sm:inline">
              Ctrl K
            </kbd>
          </button>

          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-8 px-3 sm:px-4">
        <aside className="no-print hidden w-52 shrink-0 py-6 lg:block">
          <nav className="sticky top-20 flex flex-col gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'bg-primary/15 text-primary' : 'text-muted hover:bg-surface2 hover:text-fg'
                  }`
                }
              >
                <item.icon />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 pb-24 pt-6 lg:pb-12">
          <Outlet />
        </main>
      </div>

      <footer className="no-print border-t border-line/10 px-4 py-6 text-center text-xs text-muted">
        <p className="mx-auto max-w-2xl">{config.disclaimer}</p>
        <p className="mt-2">
          <NavLink to="/about" className="link">
            About &amp; data notes
          </NavLink>
        </p>
      </footer>

      <nav className="no-print glass safe-bottom fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t lg:hidden">
        {BOTTOM.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                isActive ? 'text-primary' : 'text-muted'
              }`
            }
          >
            <item.icon />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <Onboarding />
    </div>
  )
}
