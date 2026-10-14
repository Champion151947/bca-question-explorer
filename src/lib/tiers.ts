import type { Tier } from './types'

export interface TierMeta {
  label: string
  short: string
  icon: string
  color: string
  chip: string
  dot: string
  hint: string
}

export const TIERS: Record<Tier, TierMeta> = {
  must: {
    label: 'Must Study',
    short: 'Must',
    icon: '🔥',
    color: 'must',
    chip: 'bg-must/12 text-must border-must/35',
    dot: 'bg-must',
    hint: 'Asked in 4 or more different years',
  },
  high: {
    label: 'High',
    short: 'High',
    icon: '⚡',
    color: 'high',
    chip: 'bg-high/12 text-high border-high/35',
    dot: 'bg-high',
    hint: 'Asked in 3 different years',
  },
  frequent: {
    label: 'Frequent',
    short: 'Frequent',
    icon: '📌',
    color: 'frequent',
    chip: 'bg-frequent/12 text-frequent border-frequent/35',
    dot: 'bg-frequent',
    hint: 'Asked in 2 different years',
  },
  once: {
    label: 'Asked once',
    short: 'Once',
    icon: '•',
    color: 'once',
    chip: 'bg-once/15 text-muted border-line',
    dot: 'bg-once',
    hint: 'One distinct year only — same-paper duplicate possible',
  },
}

export const TIER_ORDER: Tier[] = ['must', 'high', 'frequent', 'once']

export const TIER_RANK: Record<Tier, number> = { must: 0, high: 1, frequent: 2, once: 3 }
