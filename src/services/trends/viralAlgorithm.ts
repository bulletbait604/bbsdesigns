import type { Niche } from '@/lib/niches'
import { NICHES } from '@/lib/niches'

/** Bump this to invalidate old viral-research caches and scoring provenance. */
export const VIRAL_ALGORITHM_VERSION = 'viral-v2-social-etsy-2026-08-fresh'

/**
 * Viral Flash Merch Algorithm v2:
 * Research what people love on Etsy, Google Shopping, and social-discovery queries
 * (TikTok/Instagram merch language via SerpAPI — no ToS-violating HTML scrapes).
 *
 * Niches: gaming, baseball, softball + pets, teacher, nurse, humor, retro, bookish.
 * Design goal: maximalist flashy inseparable art+text graphics.
 */

export type HolidayWindow = {
  id: string
  label: string
  startMd: string
  endMd: string
  keywords: string[]
  niches: Array<Niche | 'all'>
  leadWeeks: number
}

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
    niches: ['all'],
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
  'viral',
  'tiktok',
  'etsy',
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
  'nurse',
  'dog mom',
  'cat mom',
  'book',
  'reader',
  'coach',
  'beer league',
  'gamer',
  'tournament',
  'dugout',
  'night owl',
  'team mom',
  'plant mom',
]

export function scoreFlashDesignFit(text: string): number {
  const lower = text.toLowerCase()
  const hits = FLASH_DESIGN_TERMS.reduce((n, t) => (lower.includes(t) ? n + 1 : n), 0)
  let score = 40 + Math.min(45, hits * 8)
  if (/\b(official|licensed|authentic)\b/i.test(lower)) score -= 25
  if (/\b(minimal|plain text|quote only)\b/i.test(lower)) score -= 20
  if (
    /\b(gamer dad|beer league|dugout|lag|respawn|softball mom|dog mom|teacher|nurse|bookish)\b/i.test(
      lower
    )
  ) {
    score += 12
  }
  return Math.max(0, Math.min(100, Math.round(score)))
}

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

export function activeOccasionBrief(niche: Niche, now = new Date()): string {
  const active = getActiveHolidayWindows(now).filter(
    (w) => w.niches.includes('all') || w.niches.includes(niche)
  )
  if (!active.length) return 'Evergreen identity humor (no peak holiday window).'
  return active
    .slice(0, 3)
    .map(
      (w) =>
        `${w.label} (list ~${w.leadWeeks}w early; keywords: ${w.keywords.slice(0, 3).join(', ')})`
    )
    .join(' | ')
}

export const VIRAL_TREND_WEIGHTS = {
  virality: 0.24,
  growth: 0.14,
  commercialIntent: 0.2,
  audienceFit: 0.12,
  seasonality: 0.16,
  evergreenPotential: 0.06,
  competition: 0.08,
} as const

/** Cross-marketplace / social-discovery queries (themes only). */
export function viralMarketplaceQueries(now = new Date()): string[] {
  const occasion = getActiveHolidayWindows(now)
    .slice(0, 2)
    .flatMap((w) => [
      `viral ${w.keywords[0]} funny tshirt`,
      `etsy bestselling ${w.keywords[0]} graphic tee`,
    ])
  return [
    'viral funny graphic tshirt tiktok',
    'etsy bestselling funny tshirt',
    'trending sarcastic graphic tee',
    'retro y2k bubble letter tshirt',
    'dog mom funny shirt viral',
    'teacher humor graphic tee',
    'nurse funny shirt etsy',
    'book lover funny tshirt graphic',
    'halloween funny graphic tee viral',
    ...occasion,
  ].slice(0, 10)
}

/** Map a marketplace title to the best matching niche. */
export function inferNicheFromText(text: string): Niche {
  const lower = text.toLowerCase()
  if (/\b(softball)\b/.test(lower)) return 'softball'
  if (/\b(baseball|dugout|homer)\b/.test(lower)) return 'baseball'
  if (/\b(gamer|gaming|controller|lag|respawn|pixel)\b/.test(lower)) return 'gaming'
  if (/\b(teacher|educator|classroom|principal)\b/.test(lower)) return 'teacher'
  if (/\b(nurse|rn\b|healthcare|scrubs)\b/.test(lower)) return 'nurse'
  if (/\b(dog|cat|pet|puppy|kitten|golden retriever)\b/.test(lower)) return 'pets'
  if (/\b(book|reader|library|novel|bookish)\b/.test(lower)) return 'bookish'
  if (/\b(retro|vintage|y2k|90s|80s)\b/.test(lower)) return 'retro'
  return 'humor'
}

/** Research query packs per niche — SerpAPI/Etsy (themes only, never copy art). */
export function viralSearchQueries(niche: Niche, now = new Date()): string[] {
  const base: Record<Niche, string[]> = {
    gaming: [
      'funny gaming tshirt viral',
      'gamer humor flashy graphic tee',
      'retro gamer bubble typography shirt',
    ],
    baseball: [
      'funny baseball tshirt viral',
      'beer league baseball graphic tee',
      'baseball dad joke merch',
    ],
    softball: [
      'funny softball tshirt viral',
      'softball mom humor graphic tee',
      'beer league softball shirt',
    ],
    pets: [
      'funny dog mom tshirt etsy',
      'viral pet parent graphic tee',
      'sarcastic cat mom shirt flashy',
      'breed specific dog humor tee',
    ],
    teacher: [
      'funny teacher tshirt etsy',
      'viral teacher humor graphic tee',
      'back to school teacher shirt funny',
      'sarcastic educator merch',
    ],
    nurse: [
      'funny nurse tshirt etsy',
      'viral nurse humor graphic tee',
      'sarcastic healthcare worker shirt',
      'nurse appreciation funny tee',
    ],
    humor: [
      'viral funny graphic tshirt tiktok',
      'etsy bestselling sarcastic tee',
      'trending flashy cartoon merch shirt',
      'maximalist funny streetwear tee',
    ],
    retro: [
      'retro y2k graphic tshirt viral',
      'vintage bubble letter tee etsy',
      '90s flashy cartoon merch shirt',
      'neon retro typography tshirt',
    ],
    bookish: [
      'funny book lover tshirt etsy',
      'viral reader humor graphic tee',
      'bookish sarcastic shirt flashy',
      'library humor cartoon merch',
    ],
  }

  const occasion: string[] = []
  for (const w of getActiveHolidayWindows(now)) {
    if (!(w.niches.includes('all') || w.niches.includes(niche))) continue
    occasion.push(`funny ${niche} ${w.keywords[0]} tshirt`)
    occasion.push(`${niche} ${w.keywords[0]} viral graphic tee`)
  }

  // Always mix in one social/marketplace discovery query
  const social = [
    `${niche} funny shirt tiktok`,
    `etsy ${niche} bestselling tshirt`,
  ]

  return [...base[niche], ...social, ...occasion].slice(0, 8)
}

export function primaryViralQuery(niche: Niche, now = new Date()): string {
  return viralSearchQueries(niche, now)[0]
}

export function allResearchNiches(): Niche[] {
  return [...NICHES]
}
