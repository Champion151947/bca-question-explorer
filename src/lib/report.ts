import { config } from '../config'
import type { Cluster } from '../lib/types'

interface ReportArgs {
  subjectName: string
  subjectSlug: string
  segmentLabel?: string | null
  cluster?: Cluster | null
  extra?: string
}

export function reportUrl({ subjectName, subjectSlug, segmentLabel, cluster, extra }: ReportArgs): string {
  const lines: string[] = [
    'Issue type: (wrong question text / duplicate / wrong repeat count / wrong subject / other)',
    '',
    `Subject: ${subjectName} (${subjectSlug})`,
  ]
  if (segmentLabel) lines.push(`Syllabus: ${segmentLabel}`)
  if (cluster) {
    lines.push(`Question: ${cluster.title}`)
    lines.push(`Years: ${[...cluster.yearsAsked].sort().join(', ') || 'none'}`)
    lines.push(`Cluster id: ${cluster.id}`)
  }
  if (extra) lines.push('', extra)
  lines.push('', 'What looks wrong:', '')

  const body = lines.join('\n')
  const subject = `[BCA Explorer] Issue: ${subjectName}`

  if (config.feedbackFormUrl) {
    const u = new URL(config.feedbackFormUrl)
    u.searchParams.set('subject', subject)
    u.searchParams.set('body', body)
    return u.toString()
  }
  return `mailto:${config.feedbackEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
