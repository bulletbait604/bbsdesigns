import type { Niche } from '@/types'
import { bootstrapProviders } from '@/providers/bootstrap'
import { tryGetProvider } from '@/providers/registry'
import { logger } from '@/lib/logger'

export const SLOGAN_PROMPT_VERSION = 'slogan-engine-v2'

type Template = {
  niche: Niche
  slogan: string
  concept: string
}

/** Original template bank — not scraped, no franchise marks. Offline fallback. */
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

export type SloganCandidateDraft = {
  niche: Niche
  slogan: string
  concept: string
  promptVersion: string
  source: 'ai' | 'template'
}

function fromTemplates(input: {
  niche: Niche
  trendTitle?: string
  limit: number
}): SloganCandidateDraft[] {
  const pool = listSloganTemplates(input.niche)
  const picked = pool.slice(0, input.limit).map((t) => ({
    niche: t.niche,
    slogan: t.slogan,
    concept: input.trendTitle
      ? `${t.concept} (inspired by trend: ${input.trendTitle})`
      : t.concept,
    promptVersion: SLOGAN_PROMPT_VERSION,
    source: 'template' as const,
  }))

  if (input.trendTitle && picked[0]) {
    const flavor = {
      niche: input.niche,
      slogan: `${picked[0].slogan.split(' ')[0]} Mode: Activated`,
      concept: `Trend-fit variant for ${input.trendTitle}`,
      promptVersion: SLOGAN_PROMPT_VERSION,
      source: 'template' as const,
    }
    return [...picked, flavor].slice(0, input.limit)
  }

  return picked
}

function parseAiSloganJson(text: string, niche: Niche): SloganCandidateDraft[] {
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return []
  try {
    const parsed = JSON.parse(match[0]) as Array<{ slogan?: string; concept?: string }>
    return parsed
      .filter((row) => typeof row.slogan === 'string' && row.slogan.trim().length >= 4)
      .map((row) => ({
        niche,
        slogan: String(row.slogan).trim().slice(0, 80),
        concept: String(row.concept || 'AI merch concept').trim().slice(0, 200),
        promptVersion: SLOGAN_PROMPT_VERSION,
        source: 'ai' as const,
      }))
  } catch {
    return []
  }
}

/**
 * Generate slogan candidates via AI when configured; otherwise template bank.
 * Themes only — never copy franchises, logos, celebrities, or protected marks.
 */
export async function generateSloganCandidates(input: {
  niche: Niche
  trendTitle?: string
  limit?: number
  useAi?: boolean
}): Promise<SloganCandidateDraft[]> {
  const limit = input.limit ?? 4
  const templates = fromTemplates({ niche: input.niche, trendTitle: input.trendTitle, limit })

  if (input.useAi === false) return templates

  bootstrapProviders()
  const ai = tryGetProvider('ai_text')
  if (!ai || !ai.validateConfig().ok || ai.name.includes('stub')) {
    return templates
  }

  try {
    const result = await ai.complete({
      temperature: 0.95,
      maxTokens: 400,
      system:
        'You write ORIGINAL funny merch slogans. Never use trademarks, game titles, team names, celebrities, logos, or copyrighted catchphrases. Adult humor ok; no slurs, hate, threats, or explicit sex.',
      prompt: [
        `Niche: ${input.niche} humor merch.`,
        input.trendTitle ? `Trend theme (do not copy marks): ${input.trendTitle}` : '',
        `Return ONLY a JSON array of ${limit} objects: [{"slogan":"...","concept":"..."}]`,
        'Slogans: short, punchy, sarcastic/cheeky, printable on a tee (max ~8 words).',
      ]
        .filter(Boolean)
        .join('\n'),
    })

    const aiRows = parseAiSloganJson(result.text, input.niche).slice(0, limit)
    if (aiRows.length) {
      logger.info('slogan_ai_generated', { niche: input.niche, count: aiRows.length })
      return aiRows
    }
  } catch (error) {
    logger.warn('slogan_ai_failed_fallback_templates', {
      error: error instanceof Error ? error.message : String(error),
    })
  }

  return templates
}

/** Sync helper for tests that only need templates. */
export function generateSloganCandidatesSync(input: {
  niche: Niche
  trendTitle?: string
  limit?: number
}): SloganCandidateDraft[] {
  return fromTemplates({
    niche: input.niche,
    trendTitle: input.trendTitle,
    limit: input.limit ?? 4,
  })
}
