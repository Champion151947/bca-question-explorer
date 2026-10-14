import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import LoginGate from './components/LoginGate'
import HomePage from './pages/HomePage'
import SubjectPage from './pages/SubjectPage'
import SearchPage from './pages/SearchPage'
import AboutPage from './pages/AboutPage'
import ToolsPage from './pages/ToolsPage'
import ProgressPage from './pages/ProgressPage'
import NotFoundPage from './pages/NotFoundPage'
import { applyTheme, useStore } from './store/useStore'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])
  return null
}

export default function App() {
  const theme = useStore((s) => s.theme)

  useEffect(() => {
    applyTheme(theme)
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const handler = () => {
      if (useStore.getState().theme === 'system') applyTheme('system')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  return (
    <ErrorBoundary>
      <LoginGate>
        <ScrollToTop />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/subject/:slug" element={<SubjectPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/tools" element={<ToolsPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </LoginGate>
    </ErrorBoundary>
  )
}
