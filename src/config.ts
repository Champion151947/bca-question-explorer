/**
 * Site configuration. Edit these values — nothing else should contain
 * user-facing copy that needs changing per-deployment.
 */
export const config = {
  siteName: 'BCA Question Explorer',
  shortName: 'BCA Explorer',
  tagline: 'See what keeps coming back in exams. Revise it first.',
  subtitle:
    'Pick your semester, see the questions that repeat, and revise those first. Unofficial student resource.',
  /** Creator details shown on the About page. */
  authorName: 'Adithya Krishna V',
  githubUrl: 'https://github.com/Champion151947',
  linkedinUrl: 'https://www.linkedin.com/in/adithya-krishna-v-959769443/',
  /** Where "Report an issue" emails go. Replace with your own address. */
  feedbackEmail: 'bca-explorer-feedback@example.com',
  /** Optional: an external feedback form URL. If set, it is used instead of mailto. */
  feedbackFormUrl: '',
  /** Show "view original paper" only if you actually host the papers. */
  paperLinksEnabled: false,
  repoUrl: 'https://github.com/your-user/bca-question-explorer',
  disclaimer:
    'Unofficial student resource. Built from past question papers (some scanned with OCR), so text errors are possible. Not affiliated with or endorsed by Calicut University. Do not republish full papers.',
  dataNotice:
    'Repeat counts use distinct exam years, counted inside each syllabus segment. Scheme (CBCSS/FYUGP) comes from paper metadata, never guessed from the year.',
  /** Shown on the About page. */
  papersCopyright:
    'All the question papers used on this site were collected and compiled by me. The copyright of the original question papers belongs to Calicut University and their respective authors. This is an unofficial, non-commercial student project — please do not republish the papers.',
} as const

export type Config = typeof config

/**
 * Display-only headline numbers shown on the site (Home / About).
 * These affect what is *shown*; the underlying dataset is unchanged.
 */
export const displayStats = {
  subjects: 49,
  papers: 342,
  questions: 7798,
} as const
