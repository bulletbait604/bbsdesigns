import {
  DESIGN_PROMPT_VERSION,
  type BuiltDesignPrompt,
  type DesignPromptInput,
} from '@/services/designs/types'

const STYLE_BY_NICHE: Record<string, string> = {
  gaming:
    'bold vector cartoon streetwear graphic, thick clean outlines, neon accents on deep charcoal, high-contrast flat shading, Threadless/POD tee energy',
  baseball:
    'bold vector cartoon streetwear graphic, thick clean outlines, grass-green and chalk-white accents, high-contrast flat shading, premium beer-league merch energy',
  softball:
    'bold vector cartoon streetwear graphic, thick clean outlines, sunset coral and violet accents, high-contrast flat shading, weekend-warrior merch energy',
}

const SUBJECT_HINT: Record<string, string> = {
  gaming:
    'one dominant original mascot-or-object scene (stylized controller creature, lag ghost, cracked pixel heart, or headset hero) — invent original shapes, never a real game character',
  baseball:
    'one dominant original object scene (cracked bat with sparks, diving mitt, mischievous baseball with attitude) — invent original marks, never a real team',
  softball:
    'one dominant original object scene (sunburnt mitt with sunglasses, muddy cleats kicking glitter, pizza-slice catcher) — invent original marks, never a real team',
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
  // Prefer the most concrete sentence
  const sentences = raw.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)
  const concrete =
    sentences.find((s) => /\b(cartoon|illustration|visual|mascot|bat|mitt|controller|pixel)\b/i.test(s)) ||
    sentences[sentences.length - 1] ||
    raw
  return concrete.slice(0, 280)
}

/**
 * Merch-quality illustration prompt: subject/style/composition/text — not a safety essay.
 */
export function buildDesignPrompt(input: DesignPromptInput): BuiltDesignPrompt {
  const style = STYLE_BY_NICHE[input.niche] || STYLE_BY_NICHE.gaming
  const visual = extractVisualBrief(input.concept, input.niche)
  const slogan = input.slogan.trim()

  const prompt = [
    'Create ONE square print-ready T-shirt graphic as a finished illustrated IMAGE.',
    'SUBJECT: ' + visual + '.',
    'The illustration must be the hero — large, centered, readable from 10 feet away, covering most of the canvas.',
    'STYLE: ' + style + '.',
    'COMPOSITION: single iconic focal subject, generous negative space for apparel print, no collage, no photo montage, no mockup of a shirt (output the print artwork itself).',
    'BACKGROUND: clean solid dark charcoal or soft gradient void — not a busy scene, not white paper poster.',
    `TEXT: render exactly this slogan in bold condensed display lettering under the art, secondary weight (~15% of the design): "${slogan}". Spelling must be perfect. Do not invent extra words.`,
    'QUALITY: crisp edges, saturated but print-safe colors, professional POD catalog look — not clipart, not AI mush, not watermarked stock.',
    'HARD LIMITS: original artwork only; no logos; no copyrighted characters; no real video-game UI; no pro sports team marks/mascots/jerseys; no celebrity likeness; no watermarks.',
  ].join(' ')

  const negativePrompt = [
    'typography-only poster',
    'quote card',
    'empty background with centered text',
    'blurry',
    'low detail mush',
    'extra fingers',
    'misspelled text',
    'watermark',
    'logo',
    'photoreal jersey',
    'shirt mockup',
    'busy collage',
  ].join(', ')

  return {
    prompt,
    negativePrompt,
    promptVersion: DESIGN_PROMPT_VERSION,
    width: 1024,
    height: 1024,
  }
}
