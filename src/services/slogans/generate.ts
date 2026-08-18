import type { Niche } from '@/types'
import { bootstrapProviders } from '@/providers/bootstrap'
import { tryGetProvider } from '@/providers/registry'
import { logger } from '@/lib/logger'
import { activeOccasionBrief } from '@/services/trends/viralAlgorithm'

export const SLOGAN_PROMPT_VERSION = 'slogan-engine-v4-viral-flash'

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
    concept:
      'Self-roast for high-ping loyalty. Visual: chubby cartoon Wi-Fi ghost dripping delay clocks, headset tilted, neon outline on dark void.',
  },
  {
    niche: 'gaming',
    slogan: 'Ctrl+Alt+Del My Attitude',
    concept:
      'Sarcastic reset energy for tilt. Visual: chunky keyboard keys exploding into confetti, one key stamped RESET, bold comic ink.',
  },
  {
    niche: 'gaming',
    slogan: 'I Queue Therefore I Suffer',
    concept:
      'Matchmaking philosophy joke. Visual: stick-figure warrior stuck in an endless spiral loading ring, deadpan face, punchy flat colors.',
  },
  {
    niche: 'gaming',
    slogan: 'Respawned But Emotionally Not',
    concept:
      'Mild dark humor after losses. Visual: pixel heart cracked in two with a tiny bandage, soft glow, clean vector shapes.',
  },
  {
    niche: 'baseball',
    slogan: 'I Only Swing At Bad Ideas',
    concept:
      'Beer-league confession. Visual: cartoon batter mid-swing at a floating lightbulb labeled BAD, dirt spray, bold outline.',
  },
  {
    niche: 'baseball',
    slogan: 'Error 6 Mentality',
    concept:
      'Own-your-mistakes infield joke. Visual: glove dropping a glowing ball with comic BOOP, sweat drops, stadium dusk palette.',
  },
  {
    niche: 'baseball',
    slogan: 'Pitch Count? I Lost Count',
    concept:
      'Weekend warrior sarcasm. Visual: weary pitcher with dizzy stars and a crumpled scorecard, thick screen-print lines.',
  },
  {
    niche: 'baseball',
    slogan: 'Sunflower Seeds & Bad Decisions',
    concept:
      'Dugout snack culture. Visual: overflowing seed bag tipping into chaos with a cracked bat silhouette, cheeky poster energy.',
  },
  {
    niche: 'softball',
    slogan: 'Sunburnt. Competitive. Still Here.',
    concept:
      'Beer-league identity. Visual: sun-blasted catcher mitt with sunglasses and a melting ice pack, hot coral highlights.',
  },
  {
    niche: 'softball',
    slogan: 'Dugout Gossip Club',
    concept:
      'Team-social humor. Visual: two bats leaning like gossiping friends with speech bubbles of dots, playful flat illustration.',
  },
  {
    niche: 'softball',
    slogan: 'Cleats On. Dignity Optional.',
    concept:
      'Mildly risqué rec athlete joke. Visual: muddy cleats kicking up sparks of glitter, confident pose silhouette, no people faces.',
  },
  {
    niche: 'softball',
    slogan: 'Pizza First. Standings Later.',
    concept:
      'Post-game priorities. Visual: pizza slice wearing a tiny catcher helmet on a scoreboard that reads LATER, warm comedy colors.',
  },
]

const GOOD_EXAMPLES: Record<Niche, string[]> = {
  gaming: ['Lag Is A Lifestyle', 'I Queue Therefore I Suffer', 'Respawned But Emotionally Not'],
  baseball: ['I Only Swing At Bad Ideas', 'Sunflower Seeds & Bad Decisions', 'Error 6 Mentality'],
  softball: ['Sunburnt. Competitive. Still Here.', 'Cleats On. Dignity Optional.', 'Pizza First. Standings Later.'],
}

/** Cheap patterns that produce unbuyable / cringe merch copy. */
const WEAK_SLOGAN_PATTERNS: RegExp[] = [
  /\bmode\s*:\s*activated\b/i,
  /\bactivated\b/i,
  /\bvibes?\b/i,
  /\bit'?s giving\b/i,
  /\bmain character\b/i,
  /\bceo of\b/i,
  /\blive laugh\b/i,
  /\bslay\b/i,
  /\bno cap\b/i,
  /\bfr fr\b/i,
  /\bgamer (girl|boy|moment)\b/i,
  /\blevel up your life\b/i,
  /\bgame on\b/i,
  /\bjust a girl who\b/i,
  /\bbaseball mom life\b/i,
  /\bsoftball life\b/i,
  /\bi (love|heart) (gaming|baseball|softball)\b/i,
  /^keep calm\b/i,
  /\best\.?\s*\d{4}\b/i,
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
  // Rotate by trend hash so we don't always emit the same first N templates
  const offset = input.trendTitle
    ? Math.abs([...input.trendTitle].reduce((a, c) => a + c.charCodeAt(0), 0)) % Math.max(1, pool.length)
    : 0
  const rotated = [...pool.slice(offset), ...pool.slice(0, offset)]
  return rotated.slice(0, input.limit).map((t) => ({
    niche: t.niche,
    slogan: t.slogan,
    concept: input.trendTitle
      ? `${t.concept} Trend theme only (do not copy marks): ${input.trendTitle}.`
      : t.concept,
    promptVersion: SLOGAN_PROMPT_VERSION,
    source: 'template' as const,
  }))
}

export function isWeakSlogan(slogan: string): boolean {
  const s = slogan.trim()
  if (s.length < 8 || s.length > 56) return true
  const words = s.split(/\s+/).filter(Boolean)
  if (words.length < 2 || words.length > 10) return true
  if (WEAK_SLOGAN_PATTERNS.some((re) => re.test(s))) return true
  if (/[!?]{2,}/.test(s)) return true
  if ((s.match(/[A-Z]/g) || []).length > s.length * 0.7 && words.length > 3) return true
  // Too generic single noun merch
  if (/^(gamer|baseball|softball|champion|winner|player)\b/i.test(s) && words.length <= 3) return true
  return false
}

function parseAiSloganJson(text: string, niche: Niche): SloganCandidateDraft[] {
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return []
  try {
    const parsed = JSON.parse(match[0]) as Array<{
      slogan?: string
      concept?: string
      visual?: string
    }>
    return parsed
      .filter((row) => typeof row.slogan === 'string' && row.slogan.trim().length >= 4)
      .map((row) => {
        const slogan = String(row.slogan).trim().slice(0, 80)
        const visual = String(row.visual || '').trim()
        const conceptBase = String(row.concept || '').trim()
        const concept = [conceptBase, visual ? `Visual: ${visual}` : '']
          .filter(Boolean)
          .join(' ')
          .slice(0, 320)
        return {
          niche,
          slogan,
          concept: concept || 'Original humor merch concept with a bold cartoon illustration.',
          promptVersion: SLOGAN_PROMPT_VERSION,
          source: 'ai' as const,
        }
      })
      .filter((row) => !isWeakSlogan(row.slogan))
  } catch {
    return []
  }
}

function buildSloganSystemPrompt(niche: Niche): string {
  const examples = GOOD_EXAMPLES[niche].map((e) => `"${e}"`).join(', ')
  return [
    'You are a senior merch copywriter for a premium POD brand selling funny adult tees that go viral on Etsy/Shopify.',
    'Write ORIGINAL slogans using Identity × Interest × Occasion (specific role + niche joke + gift/holiday angle when relevant).',
    'Voice: cheeky beer-league / gaming-night humor. Not cringe TikTok slang. Not corporate. Not motivational poster.',
    'Slogans must work as FLASHY inseparable art+text tee lettering (bubble/varsity/kinetic type).',
    'Never use trademarks, game titles, team names, celebrities, logos, or copyrighted catchphrases.',
    'No slurs, hate, threats, or explicit sexual content.',
    `Gold-standard examples for tone (do not copy verbatim): ${examples}.`,
  ].join(' ')
}

function buildSloganUserPrompt(input: {
  niche: Niche
  trendTitle?: string
  limit: number
}): string {
  const occasion = activeOccasionBrief(input.niche)
  return [
    `Niche: ${input.niche} humor apparel.`,
    `Active gift/holiday windows: ${occasion}`,
    input.trendTitle
      ? `Trend theme for inspiration only (never copy brand/game/team names from it): ${input.trendTitle}`
      : 'Invent a fresh identity-specific angle for this niche.',
    `Return ONLY a JSON array of ${input.limit} objects with keys slogan, concept, visual.`,
    'Rules for slogan:',
    '- 3 to 8 words (or two short punchy sentences with periods)',
    '- max 48 characters preferred',
    '- specific joke tied to a role/identity (mom, dad, beer league, gamer, coach) — not generic "I love [sport/gaming]"',
    '- printable as bold flashy tee lettering woven into a graphic',
    '- avoid: Mode Activated, vibes, it\'s giving, main character, CEO of, Live Laugh, hashtags',
    'Rules for concept: one sentence explaining the joke + why it gifts well now.',
    'Rules for visual: one concrete FLASHY illustration brief for a viral tee — subject that can lock into lettering (mascot with headband/banner, icon that can replace a letter, bolt/bat/mitt that can weave through stacked type). Include color vibe (neon, candy, athletic yellow, spooky-cute if Halloween window). No real people photos. No logos.',
  ]
    .filter(Boolean)
    .join('\n')
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

  // Over-generate then keep strongest non-weak lines
  const ask = Math.min(12, Math.max(limit * 2, limit + 2))

  try {
    const result = await ai.complete({
      temperature: 0.82,
      maxTokens: 900,
      system: buildSloganSystemPrompt(input.niche),
      prompt: buildSloganUserPrompt({ niche: input.niche, trendTitle: input.trendTitle, limit: ask }),
    })

    const aiRows = parseAiSloganJson(result.text, input.niche)
    // Dedupe by normalized slogan
    const seen = new Set<string>()
    const unique: SloganCandidateDraft[] = []
    for (const row of aiRows) {
      const key = row.slogan.toLowerCase().replace(/[^a-z0-9]+/g, '')
      if (seen.has(key)) continue
      seen.add(key)
      unique.push(row)
    }

    if (unique.length >= Math.min(2, limit)) {
      logger.info('slogan_ai_generated', { niche: input.niche, count: unique.length, kept: limit })
      return unique.slice(0, limit)
    }

    logger.warn('slogan_ai_thin_quality_blend_templates', {
      niche: input.niche,
      aiCount: unique.length,
    })
    return [...unique, ...templates].slice(0, limit)
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
