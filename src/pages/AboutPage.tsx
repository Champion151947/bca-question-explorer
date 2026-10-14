import { config } from '../config'
import { TIERS, TIER_ORDER } from '../lib/tiers'
import { TierBadge } from '../components/ui'
import { IconGithub, IconLinkedin } from '../components/icons'

export default function AboutPage() {
  const year = new Date().getFullYear()

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">About</h1>
        <p className="mt-1 text-muted">{config.tagline}</p>
      </header>

      <section className="card p-4">
        <h2 className="text-lg font-bold">Hi, I&apos;m {config.authorName}</h2>
        <p className="mt-1 text-sm text-muted">
          I built <strong className="text-fg">{config.siteName}</strong> to help BCA students prepare
          for their exams. Instead of guessing what to study, you can see which questions keep
          repeating and revise those first.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            className="btn-soft"
            href={config.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <IconGithub /> GitHub
          </a>
          <a
            className="btn-soft"
            href={config.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <IconLinkedin /> LinkedIn
          </a>
        </div>
      </section>

      <section className="card p-4">
        <h2 className="text-lg font-bold">How repeat counts work</h2>
        <p className="mt-1 text-sm text-muted">
          A question&apos;s tier is based on how many <strong>different exam years</strong> it appeared
          in — not how many times a phrase appears. Two questions in the same paper count once, so a
          single paper can never make a topic look &ldquo;repeated&rdquo;.
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {TIER_ORDER.map((tier) => (
            <li key={tier} className="flex items-center gap-2 text-sm">
              <TierBadge tier={tier} />
              <span className="text-muted">{TIERS[tier].hint}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">
          Counts are calculated inside each syllabus segment (subject + semester + scheme), using the
          scheme recorded on the paper. Scheme is never guessed from the year.
        </p>
      </section>

      <section className="card p-4">
        <h2 className="text-lg font-bold">Copyright</h2>
        <p className="mt-1 text-sm text-muted">
          &copy; {year} {config.authorName}. {config.papersCopyright}
        </p>
      </section>

      <p className="text-xs text-muted">{config.disclaimer}</p>
    </div>
  )
}
