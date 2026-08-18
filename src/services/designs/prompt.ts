import {
  DESIGN_PROMPT_VERSION,
  type BuiltDesignPrompt,
  type DesignPromptInput,
} from '@/services/designs/types'

const STYLE_BY_NICHE: Record<string, string> = {
  gaming:
    'viral streetwear merch graphic — explosive neon, thick comic outlines, high-pop contrast, scroll-stopping energy like a bestselling Redbubble/Threadless tee',
  baseball:
    'viral beer-league merch graphic — loud chalk-dust energy, cracked-bat sparks, high-pop contrast, scroll-stopping dugout swagger',
  softball:
    'viral weekend-warrior merch graphic — hot sunset pops, muddy-cleat attitude, high-pop contrast, scroll-stopping team-chat energy',
}

const SUBJECT_HINT: Record<string, string> = {
  gaming:
    'one unforgettable original cartoon hero (lag ghost, exploding controller creature, cracked pixel heart with attitude) — invent original shapes, never a real game character',
  baseball:
    'one unforgettable original cartoon hero object (swagger baseball with shades, bat mid-chaos spark, diving mitt catching lightning) — invent original marks, never a real team',
  softball:
    'one unforgettable original cartoon hero object (sunburnt mitt with attitude, pizza-helmet catcher, cleats kicking glitter fireworks) — invent original marks, never a real team',
}

/**
 * Extract a concrete visual brief from concept text when present.
 */
export function extractVisualBrief(concept?: string, niche?: string): string {
  const raw = (concept || '').trim()
  if (!raw) {
    return SUBJECT_HINT[niche || 'gaming'] || SUBJECT_HINT.gaming
  }
  const visualMatch = raw.match(/visual:\s*(.+)$/i)
  if (visualMatch?.[1]) return visualMatch[1].trim().slice(0, 280)
  const sentences = raw.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)
  const concrete =
    sentences.find((s) => /\b(cartoon|illustration|visual|mascot|bat|mitt|controller|pixel)\b/i.test(s)) ||
    sentences[sentences.length - 1] ||
    raw
  return concrete.slice(0, 280)
}

/**
 * Single-shot viral merch design: imagery + slogan text integrated by the AI in one image.
 */
export function buildDesignPrompt(input: DesignPromptInput): BuiltDesignPrompt {
  const style = STYLE_BY_NICHE[input.niche] || STYLE_BY_NICHE.gaming
  const visual = extractVisualBrief(input.concept, input.niche)
  const slogan = input.slogan.trim()

  const prompt = [
    'Create ONE square viral print-ready T-shirt DESIGN as a finished IMAGE.',
    'CRITICAL: this is ONE integrated design — bold cartoon IMAGERY and the slogan TEXT must live in the same composition (not a text poster, not art with empty space for later type).',
    'VIRAL BAR: eye-catching, loud, shareable, premium POD catalog energy. Not boring. Not corporate. Not minimal empty posters. Not clipart mush.',
    'HERO IMAGE (required): ' + visual + ' — large, centered, dominating the canvas so the eye lands on the picture first.',
    'STYLE: ' + style + '.',
    `SLOGAN TEXT (required, exact spelling): integrate these exact words into the design as bold display lettering that feels part of the art: "${slogan}".`,
    'TEXT INTEGRATION: wrap, arch, stamp, or stack the lettering so it locks into the illustration (banner ribbon, exploding caption, stamped under the hero, comic burst) — spelling must be perfect, no extra words, no typos.',
    'COMPOSITION: single iconic scene, high contrast, saturated accents, clean edges for DTG/screen print, dark or void background that makes the graphic POP. No shirt mockup. No photo collage.',
    'HARD LIMITS: original artwork only; no logos; no copyrighted characters; no real video-game UI; no pro sports team marks/mascots/jerseys; no celebrity likeness; no watermarks.',
  ].join(' ')

  const negativePrompt = [
    'boring',
    'minimal empty poster',
    'typography-only quote card',
    'art without any text',
    'text without illustration',
    'blurry',
    'low detail mush',
    'misspelled text',
    'extra words not in slogan',
    'watermark',
    'logo',
    'shirt mockup',
    'photoreal jersey',
    'busy unreadable collage',
  ].join(', ')

  return {
    prompt,
    negativePrompt,
    promptVersion: DESIGN_PROMPT_VERSION,
    width: 2048,
    height: 2048,
  }
}
