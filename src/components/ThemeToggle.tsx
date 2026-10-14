import { IconMonitor, IconMoon, IconSun } from './icons'
import { useStore, type ThemePref } from '../store/useStore'

const ORDER: ThemePref[] = ['dark', 'light', 'system']
const LABEL: Record<ThemePref, string> = {
  dark: 'Dark theme',
  light: 'Light theme',
  system: 'System theme',
}

export default function ThemeToggle() {
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)

  function cycle() {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]
    setTheme(next)
  }

  const Icon = theme === 'dark' ? IconMoon : theme === 'light' ? IconSun : IconMonitor

  return (
    <button
      type="button"
      onClick={cycle}
      className="btn-ghost !px-3"
      aria-label={`${LABEL[theme]} — click to change`}
      title={`${LABEL[theme]} (click to change)`}
    >
      <Icon />
    </button>
  )
}
