import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>

const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export const IconHome = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
  </svg>
)
export const IconSearch = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)
export const IconTools = (p: P) => (
  <svg {...base} {...p}>
    <path d="M14.7 6.3a4 4 0 0 0 5 5L21 21l-3 .5L6.5 10A4 4 0 0 1 10 3.5l-1.3 1.3a2.8 2.8 0 0 0 4 4z" />
  </svg>
)
export const IconProgress = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 19V5" />
    <path d="M4 19h16" />
    <path d="M8 16v-4M12 16V8M16 16v-6" />
  </svg>
)
export const IconInfo = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
)
export const IconSun = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
  </svg>
)
export const IconMoon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
  </svg>
)
export const IconMonitor = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
  </svg>
)
export const IconChevron = (p: P) => (
  <svg {...base} {...p}>
    <path d="m6 9 6 6 6-6" />
  </svg>
)
export const IconCopy = (p: P) => (
  <svg {...base} {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h8" />
  </svg>
)
export const IconCheck = (p: P) => (
  <svg {...base} {...p}>
    <path d="m5 12 5 5L20 7" />
  </svg>
)
export const IconFlag = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 21V4M5 4h11l-1.5 3L16 10H5" />
  </svg>
)
export const IconBookmark = (p: P) => (
  <svg {...base} {...p}>
    <path d="M7 4h10v16l-5-3-5 3z" />
  </svg>
)
export const IconClose = (p: P) => (
  <svg {...base} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)
export const IconSpark = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
  </svg>
)
export const IconWarning = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3 2 20h20z" />
    <path d="M12 9v5M12 17h.01" />
  </svg>
)
export const IconArrowLeft = (p: P) => (
  <svg {...base} {...p}>
    <path d="M19 12H5M11 18l-6-6 6-6" />
  </svg>
)
export const IconPrint = (p: P) => (
  <svg {...base} {...p}>
    <path d="M6 9V3h12v6" />
    <rect x="4" y="9" width="16" height="8" rx="2" />
    <path d="M8 17h8v4H8z" />
  </svg>
)
export const IconDownload = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 3v12M7 11l5 5 5-5M4 21h16" />
  </svg>
)
export const IconUpload = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 21V9M7 13l5-5 5 5M4 4h16" />
  </svg>
)
export const IconCards = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="6" width="13" height="14" rx="2" />
    <path d="M8 3h10a2 2 0 0 1 2 2v12" />
  </svg>
)
export const IconGithub = (p: P) => (
  <svg {...base} {...p} fill="currentColor" stroke="none">
    <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.48 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.34 1.12 2.91.85.09-.66.35-1.12.63-1.38-2.22-.26-4.55-1.14-4.55-5.05 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.5 9.5 0 0 1 2.5-.34c.85 0 1.71.12 2.5.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.92-2.34 4.79-4.57 5.04.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.59.69.48A10.02 10.02 0 0 0 22 12.25C22 6.58 17.52 2 12 2z" />
  </svg>
)
export const IconLinkedin = (p: P) => (
  <svg {...base} {...p} fill="currentColor" stroke="none">
    <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM10 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.4c0-1.29-.02-2.95-1.8-2.95-1.8 0-2.07 1.4-2.07 2.85V21h-4z" />
  </svg>
)
export const IconMoon2 = IconMoon
