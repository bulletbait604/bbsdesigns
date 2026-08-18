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
  const sentences = raw.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)
  const concrete =
    sentences.find((s) => /\b(cartoon|illustration|visual|mascot|bat|mitt|controller|pixel)\b/i.test(s)) ||
    sentences[sentences.length - 1] ||
    raw
  return concrete.slice(0, 280)
}

/**
 * Art-only prompt for the image model. Slogan typography is composited afterward
 * (starter pack: original artwork + clean typography — never text-only posters).
 */
export function buildDesignPrompt(input: DesignPromptInput): BuiltDesignPrompt {
  const style = STYLE_BY_NICHE[input.niche] || STYLE_BY_NICHE.gaming
  const visual = extractVisualBrief(input.concept, input.niche)
  const slogan = input.slogan.trim()

  const prompt = [
    'Create ONE square print-ready T-shirt GRAPHIC as a finished illustrated IMAGE.',
    'This must be a PICTURE / cartoon illustration — not a typography poster.',
    'SUBJECT (required hero): ' + visual + '.',
    'The illustration fills the UPPER ~70% of the canvas, large and centered, readable from 10 feet away.',
    'STYLE: ' + style + '.',
    'COMPOSITION: single iconic focal subject, generous negative space, no collage, no photo montage, no shirt mockup (output the print artwork itself).',
    'BACKGROUND: clean solid dark charcoal or soft gradient void.',
    'TEXT RULE (critical): draw ZERO letters, words, slogans, captions, watermarks, or numbers in the image. Leave the bottom ~30% as clean dark empty space for typography that will be added later.',
    `Theme context only (do not write these words in the image): humor about "${slogan}".`,
    'QUALITY: crisp edges, saturated but print-safe colors, professional POD catalog look — not clipart, not AI mush.',
    'HARD LIMITS: original artwork only; no logos; no copyrighted characters; no real video-game UI; no pro sports team marks/mascots/jerseys; no celebrity likeness; no watermarks.',
  ].join(' ')

  const negativePrompt = [
    'any text',
    'letters',
    'words',
    'slogan',
    'typography',
    'caption',
    'watermark',
    'logo',
    'typography-only poster',
    'quote card',
    'shirt mockup',
    'busy collage',
    'blurry',
    'low detail mush',
  ].join(', ')

  return {
    prompt,
    negativePrompt,
    promptVersion: DESIGN_PROMPT_VERSION,
    width: 2048,
    height: 2048,
  }
}
