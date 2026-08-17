import type { Niche } from '@/types'

export const SLOGAN_PROMPT_VERSION = 'slogan-engine-v1'

type Template = {
  niche: Niche
  slogan: string
  concept: string
}

/** Original template bank — not scraped, no franchise marks. */
const TEMPLATES: Template[] = [
  {
    niche: 'gaming',
    slogan: 'Lag Is A Lifestyle',
    concept: 'Self-roast for high-ping loyalty',
  },
  {
    niche: 'gaming',
    slogan: 'Ctrl+Alt+Del My Attitude',
    concept: 'Sarcastic reset energy for tilt moments',
  },
  {
    niche: 'gaming',
    slogan: 'I Queue Therefore I Suffer',
    concept: 'Cheeky philosophy for matchmaking addicts',
  },
  {
    niche: 'gaming',
    slogan: 'Respawned But Emotionally Not',
    concept: 'Mildly dark humor about mental lag after losses',
  },
  {
    niche: 'baseball',
    slogan: 'I Only Swing At Bad Ideas',
    concept: 'Beer-league confession about aggressive choices',
  },
  {
    niche: 'baseball',
    slogan: 'Error 6 Mentality',
    concept: 'Infield joke for people who own their mistakes',
  },
  {
    niche: 'baseball',
    slogan: 'Pitch Count? I Lost Count',
    concept: 'Weekend warrior sarcasm',
  },
  {
    niche: 'baseball',
    slogan: 'Sunflower Seeds & Bad Decisions',
    concept: 'Dugout snack culture humor',
  },
  {
    niche: 'softball',
    slogan: 'Sunburnt. Competitive. Still Here.',
    concept: 'Beer-league softball identity line',
  },
  {
    niche: 'softball',
    slogan: 'Dugout Gossip Club',
    concept: 'Cheeky team-social humor',
  },
  {
    niche: 'softball',
    slogan: 'Cleats On. Dignity Optional.',
    concept: 'Mildly risqué recreational athlete joke',
  },
  {
    niche: 'softball',
    slogan: 'Pizza First. Standings Later.',
    concept: 'Post-game priorities',
  },
]

export function listSloganTemplates(niche?: Niche): Template[] {
  return TEMPLATES.filter((t) => (niche ? t.niche === niche : true))
}

/**
 * Generate slogan candidates from templates (+ optional trend flavor).
 * AI provider can enrich later; templates keep originality offline.
 */
export function generateSloganCandidates(input: {
  niche: Niche
  trendTitle?: string
  limit?: number
}): Array<{ niche: Niche; slogan: string; concept: string; promptVersion: string }> {
  const limit = input.limit ?? 4
  const pool = listSloganTemplates(input.niche)
  const picked = pool.slice(0, limit).map((t) => ({
    niche: t.niche,
    slogan: t.slogan,
    concept: input.trendTitle
      ? `${t.concept} (inspired by trend: ${input.trendTitle})`
      : t.concept,
    promptVersion: SLOGAN_PROMPT_VERSION,
  }))

  if (input.trendTitle && picked[0]) {
    // Light flavor without copying protected marks
    const flavor = {
      niche: input.niche,
      slogan: `${picked[0].slogan.split(' ')[0]} Mode: Activated`,
      concept: `Trend-fit variant for ${input.trendTitle}`,
      promptVersion: SLOGAN_PROMPT_VERSION,
    }
    return [...picked, flavor].slice(0, limit)
  }

  return picked
}
