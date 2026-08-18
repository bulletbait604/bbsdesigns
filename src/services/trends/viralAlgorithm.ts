import type { Niche } from '@/types'

/** Bump this to invalidate old viral-research caches and scoring provenance. */
export const VIRAL_ALGORITHM_VERSION = 'viral-v1-flash-2026-08-r1'

/**
 * Viral Flash Merch Algorithm (2026 research — Etsy/Shopify/POD public reports + SerpAPI/Etsy APIs):
 * - Identity × Interest × Occasion beats generic "funny shirt"
 * - Holiday/occasion windows spike gift demand (list 4–8 weeks early)
 * - Flash aesthetics: retro/Y2K bubble type, maximalist neon, varsity arches, sarcastic humor graphics
 * - Flash design fit: inseparable art+text (letter-as-icon, prop text, kinetic type, arched frame)
 * - Marketplace commercial intent from Shopping/Etsy demand
 * - Never bypasses IP/safety
 *
 * Sources: SerpAPI Google Shopping + Google Trends, Etsy Open API, curated viral seeds.
 * No ToS-violating HTML scrapes of Etsy/Shopify storefronts.
 */

export type HolidayWindow = {
  id: string
  label: string
  /** Inclusive month-day windows as MM-DD (UTC), may wrap year */
  startMd: string
  endMd: string
  keywords: string[]
  niches: Array<Niche | 'all'>
  leadWeeks: number
}

/** Active gift/occasion calendar for merch planning. */
export const HOLIDAY_WINDOWS: HolidayWindow[] = [
  {
    id: 'back_to_school',
    label: 'Back to School',
    startMd: '07-15',
    endMd: '09-15',
    keywords: ['back to school', 'teacher', 'first day', 'school'],
    niches: ['all'],
    leadWeeks: 6,
  },
  {
    id: 'halloween',
    label: 'Halloween',
    startMd: '08-01',
    endMd: '11-01',
    keywords: ['halloween', 'spooky', 'costume', 'pumpkin', 'trick or treat'],
    niches: ['all'],
    leadWeeks: 8,
  },
  {
    id: 'thanksgiving',
    label: 'Thanksgiving',
    startMd: '10-01',
    endMd: '11-28',
    keywords: ['thanksgiving', 'thankful', 'turkey', 'family'],
    niches: ['all'],
    leadWeeks: 6,
  },
  {
    id: 'christmas',
    label: 'Christmas / Holiday gift',
    startMd: '10-01',
    endMd: '12-26',
    keywords: ['christmas', 'holiday', 'ugly sweater', 'secret santa', 'stocking'],
    niches: ['all'],
    leadWeeks: 8,
  },
  {
    id: 'new_year',
    label: 'New Year',
    startMd: '12-15',
    endMd: '01-10',
    keywords: ['new year', 'resolution', '2027'],
    niches: ['all'],
    leadWeeks: 3,
  },
  {
    id: 'valentine',
    label: "Valentine's Day",
    startMd: '01-05',
    endMd: '02-15',
    keywords: ['valentine', 'galentine', 'love'],
    niches: ['all'],
    leadWeeks: 5,
  },
  {
    id: 'mothers_day',
    label: "Mother's Day",
    startMd: '03-15',
    endMd: '05-12',
    keywords: ["mother's day", 'mom gift', 'mama'],
    niches: ['all'],
    leadWeeks: 6,
  },
  {
    id: 'fathers_day',
    label: "Father's Day",
    startMd: '04-15',
    endMd: '06-20',
    keywords: ["father's day", 'dad gift', 'papa'],
    niches: ['gaming', 'baseball', 'softball'],
    leadWeeks: 6,
  },
  {
    id: 'july_4',
    label: '4th of July',
    startMd: '05-20',
    endMd: '07-05',
    keywords: ['4th of july', 'independence', 'patriotic'],
    niches: ['all'],
    leadWeeks: 4,
  },
  {
    id: 'baseball_season',
    label: 'Baseball / softball season',
    startMd: '02-15',
    endMd: '10-15',
    keywords: ['opening day', 'playoffs', 'world series', 'tournament', 'beer league'],
    niches: ['baseball', 'softball'],
    leadWeeks: 2,
  },
  {
    id: 'holiday_gaming',
    label: 'Holiday gaming gift',
    startMd: '10-15',
    endMd: '12-31',
    keywords: ['gamer gift', 'christmas gamer', 'holiday gaming'],
    niches: ['gaming'],
    leadWeeks: 6,
  },
]

function mdToOrdinal(md: string): number {
  const [m, d] = md.split('-').map(Number)
  return m * 100 + d
}

function dateToOrdinal(d: Date): number {
  return (d.getUTCMonth() + 1) * 100 + d.getUTCDate()
}

function inWindow(ord: number, start: number, end: number): boolean {
  if (start <= end) return ord >= start && ord <= end
  // wraps year (e.g. Dec 15 → Jan 10)
  return ord >= start || ord <= end
}

export function getActiveHolidayWindows(now = new Date()): HolidayWindow[] {
  const ord = dateToOrdinal(now)
  return HOLIDAY_WINDOWS.filter((w) =>
    inWindow(ord, mdToOrdinal(w.startMd), mdToOrdinal(w.endMd))
  )
}

export function holidayBoostForText(text: string, niche: Niche, now = new Date()): {
  score: number
  matched: string[]
} {
  const lower = text.toLowerCase()
  const active = getActiveHolidayWindows(now).filter(
    (w) => w.niches.includes('all') || w.niches.includes(niche)
  )
  const matched: string[] = []
  let score = 35
  for (const w of active) {
    const hit = w.keywords.some((k) => lower.includes(k))
    if (hit) {
      matched.push(w.id)
      score += 18
    } else {
      // Soft boost during active window even without keyword (plan ahead)
      score += 6
    }
  }
  return { score: Math.min(100, score), matched }
}

const FLASH_DESIGN_TERMS = [
  'funny',
  'sarcastic',
  'retro',
  'vintage',
  'y2k',
  'bold',
  'graphic',
  'neon',
  'bubble',
  'varsity',
  'streetwear',
  'flashy',
  'maximalist',
  'pop art',
  'drop shadow',
  'cartoon',
  'mascot',
  'humor',
  'joke',
  'spooky',
  'halloween',
  'tee',
  'tshirt',
  't-shirt',
  'merch',
]

const IDENTITY_TERMS = [
  'mom',
  'dad',
  'mama',
  'papa',
  'teacher',
  'coach',
  'beer league',
  'gamer',
  'tournament',
  'dugout',
  'night owl',
  'team mom',
]

/** How well a theme supports flashy inseparable art+text merch. */
export function scoreFlashDesignFit(text: string): number {
  const lower = text.toLowerCase()
  const hits = FLASH_DESIGN_TERMS.reduce((n, t) => (lower.includes(t) ? n + 1 : n), 0)
  // Generic "shirt" alone is weak; specificity + humor/graphic language wins
  let score = 40 + Math.min(45, hits * 8)
  if (/\b(official|licensed|authentic)\b/i.test(lower)) score -= 25
  if (/\b(minimal|plain text|quote only)\b/i.test(lower)) score -= 20
  if (/\b(gamer dad|beer league|dugout|lag|respawn|softball mom|baseball dad)\b/i.test(lower)) {
    score += 12
  }
  return Math.max(0, Math.min(100, Math.round(score)))
}

/**
 * Identity × Interest specificity (2026 Etsy/POD pattern).
 * Hyper-specific roles beat generic "funny tee".
 */
export function scoreIdentitySpecificity(text: string, niche: Niche): number {
  const lower = text.toLowerCase()
  const identityHits = IDENTITY_TERMS.reduce((n, t) => (lower.includes(t) ? n + 1 : n), 0)
  const nicheHit = lower.includes(niche) ? 1 : 0
  const occasionHit = HOLIDAY_WINDOWS.some((w) => w.keywords.some((k) => lower.includes(k)))
    ? 1
    : 0
  let score = 35 + identityHits * 14 + nicheHit * 10 + occasionHit * 12
  if (/\b(funny shirt|graphic tee|tshirt)\b/i.test(lower) && identityHits === 0) score -= 15
  return Math.max(0, Math.min(100, Math.round(score)))
}

/** Active occasion labels for slogan/design briefs. */
export function activeOccasionBrief(niche: Niche, now = new Date()): string {
  const active = getActiveHolidayWindows(now).filter(
    (w) => w.niches.includes('all') || w.niches.includes(niche)
  )
  if (!active.length) return 'Evergreen identity humor (no peak holiday window).'
  return active
    .slice(0, 3)
    .map((w) => `${w.label} (list ~${w.leadWeeks}w early; keywords: ${w.keywords.slice(0, 3).join(', ')})`)
    .join(' | ')
}

/**
 * Default weights for viral flash merch opportunity (sums to 1).
 * Emphasizes marketplace demand + flash design fit + holiday seasonality.
 */
export const VIRAL_TREND_WEIGHTS = {
  virality: 0.22,
  growth: 0.12,
  commercialIntent: 0.2,
  audienceFit: 0.12,
  seasonality: 0.18,
  evergreenPotential: 0.06,
  competition: 0.1,
} as const

/** Research query packs — SerpAPI/Etsy use these (themes only, never copy art). */
export function viralSearchQueries(niche: Niche, now = new Date()): string[] {
  const base: Record<Niche, string[]> = {
    gaming: [
      'funny gaming tshirt',
      'gamer humor shirt flashy graphic',
      'retro gamer bubble typography tee',
      'lag joke merch',
      'christmas gamer gift shirt',
    ],
    baseball: [
      'funny baseball tshirt',
      'beer league baseball shirt',
      'retro baseball varsity graphic tee',
      'baseball dad joke merch',
      'fathers day baseball shirt',
    ],
    softball: [
      'funny softball tshirt',
      'beer league softball shirt',
      'softball mom humor tee',
      'softball tournament shirt funny',
      'halloween softball shirt',
    ],
  }

  const occasion: string[] = []
  for (const w of getActiveHolidayWindows(now)) {
    if (!(w.niches.includes('all') || w.niches.includes(niche))) continue
    occasion.push(`funny ${niche} ${w.keywords[0]} tshirt`)
    occasion.push(`${niche} ${w.keywords[0]} graphic tee`)
  }

  return [...base[niche], ...occasion].slice(0, 8)
}

export function primaryViralQuery(niche: Niche, now = new Date()): string {
  return viralSearchQueries(niche, now)[0]
}
