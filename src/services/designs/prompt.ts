import {
  DESIGN_PROMPT_VERSION,
  type BuiltDesignPrompt,
  type DesignPromptInput,
} from '@/services/designs/types'
import type { Niche } from '@/types'
import { activeOccasionBrief } from '@/services/trends/viralAlgorithm'

/**
 * Flash merch formulas distilled from bestselling viral tees + user references:
 * - Letter-as-icon (daisy replaces O in HOT & FLASHY)
 * - Prop-locked text (slogan on wolf headband)
 * - Kinetic multi-color type block with graphic woven through (lightning through FLASH)
 * - Arched athletic frame over a hero graphic (SUMMIT TOUR arch)
 */
export type FlashFormulaId =
  | 'letter_as_icon'
  | 'prop_locked_text'
  | 'kinetic_type_block'
  | 'arched_hero_frame'

const FLASH_FORMULAS: Record<
  FlashFormulaId,
  { name: string; layout: string; vibe: string }
> = {
  letter_as_icon: {
    name: 'LETTER-AS-ICON',
    layout:
      'Bubbly thick 70s/Y2K display letters in multiple neon/candy colors with heavy dark drop shadows. Replace ONE letter (or the ampersand) with a cartoon icon that IS that letter — flower/heart/controller/ball/bolt face smiling. Text and icon must read as one wordmark.',
    vibe: 'HOT & FLASHY tee energy — groovy, layered shadows, playful maximalism',
  },
  prop_locked_text: {
    name: 'PROP-LOCKED TEXT',
    layout:
      'Giant original cartoon mascot/character fills the chest. Put the slogan ON a prop that belongs to the character (headband, sweatband, ribbon banner, jersey stripe, speech burst, cracked bat banner). Text is white or neon on a hot accent prop with a thin dark outline — inseparable from the art.',
    vibe: 'wolf-with-headband festival tee energy — loud vector pop art, neon accents, thick outlines',
  },
  kinetic_type_block: {
    name: 'KINETIC TYPE BLOCK',
    layout:
      'Dense stacked all-caps multi-color kinetic typography filling a tight rectangle. Vary letter sizes, stack words tightly, weave ONE bold graphic symbol (lightning bolt, bat spark, lag bolt, mitt) THROUGH the biggest word. High-contrast cyan/lime/yellow/red/white on dark void.',
    vibe: 'ONE DAY YOUR LIFE WILL FLASH tee energy — loud streetwear poster type with graphic punch',
  },
  arched_hero_frame: {
    name: 'ARCHED HERO FRAME',
    layout:
      'Hero cartoon illustration centered. Slogan arched in a semi-circle ABOVE the hero in thick athletic/varsity block letters (neon yellow or electric accent). Optional short punch line or niche tag straight UNDER the hero. High contrast on dark charcoal void — commemorative tour-tee energy but 100% original cartoon (never a photo of real people).',
    vibe: 'SUMMIT TOUR arched varsity energy — flashy, framed, readable from across a room',
  },
}

const NICHE_HEROES: Record<Niche, string> = {
  gaming:
    'original cartoon hero: lag ghost, exploding controller creature, cracked pixel heart with attitude, headset beast — invent shapes, never a real game character or UI',
  baseball:
    'original cartoon hero: swagger baseball with shades, bat mid-chaos spark, diving mitt catching lightning — invent marks, never a real team or jersey',
  softball:
    'original cartoon hero: sunburnt mitt with attitude, pizza-helmet catcher, cleats kicking glitter fireworks — invent marks, never a real team',
}

function pickFlashFormula(slogan: string, niche: Niche): FlashFormulaId {
  const ids = Object.keys(FLASH_FORMULAS) as FlashFormulaId[]
  const seed = [...`${niche}:${slogan}`].reduce((a, c) => a + c.charCodeAt(0), 0)
  return ids[seed % ids.length]
}

/**
 * Extract a concrete visual brief from concept text when present.
 */
export function extractVisualBrief(concept?: string, niche?: string): string {
  const raw = (concept || '').trim()
  if (!raw) {
    return NICHE_HEROES[(niche as Niche) || 'gaming'] || NICHE_HEROES.gaming
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

export function selectFlashFormula(input: DesignPromptInput): FlashFormulaId {
  return pickFlashFormula(input.slogan.trim(), input.niche)
}

/**
 * Flash merch prompt: imagery + slogan locked together like bestselling viral tees.
 */
export function buildDesignPrompt(input: DesignPromptInput): BuiltDesignPrompt {
  const slogan = input.slogan.trim()
  const formulaId = pickFlashFormula(slogan, input.niche)
  const formula = FLASH_FORMULAS[formulaId]
  const hero = extractVisualBrief(input.concept, input.niche)
  const occasion = activeOccasionBrief(input.niche)

  const prompt = [
    'Create ONE square print-ready T-SHIRT GRAPHIC (the print artwork only — no shirt mockup, no photo of a person wearing a tee).',
    'GOAL: a FLASHY viral merch design that looks like a bestselling Etsy / Shopify / festival streetwear tee — loud, colorful, scroll-stopping, gift-ready.',
    `SEASONAL / OCCASION CONTEXT (inspire vibe only, do not print these words unless they appear in the slogan): ${occasion}.`,
    `FLASH FORMULA (${formula.name}): ${formula.layout}`,
    `REFERENCE VIBE: ${formula.vibe}. Prefer retro/Y2K bubble type, maximalist neon, or athletic varsity energy — never boring minimal.`,
    `HERO / ICON SUBJECT: ${hero}.`,
    `SLOGAN (exact spelling, no extra words, no typos): "${slogan}".`,
    'INTEGRATION RULE (non-negotiable): the slogan lettering and the illustration must be ONE inseparable design — text woven into art, art woven into text. Forbidden: plain centered slogan under a floating sticker; forbidden: empty text poster; forbidden: art with no letters.',
    'TYPE LOOK: thick display lettering, high contrast, saturated multi-color accents OR neon athletic yellow, optional heavy drop shadows / layered 3D offset for depth. Spelling must be perfect.',
    'COLOR / CONTRAST: pop hard against a solid dark charcoal or soft void background. Clean vector-cartoon edges for DTG/screen print. Not muddy, not photoreal, not clipart mush, not boring minimal.',
    'HARD LIMITS: original artwork only; no logos; no copyrighted characters; no real video-game UI; no pro sports team marks/mascots/jerseys; no celebrity likeness; no watermarks; no real human group photos.',
  ].join(' ')

  const negativePrompt = [
    'boring',
    'minimal empty poster',
    'plain centered text under sticker art',
    'typography-only quote card',
    'art without any text',
    'text without illustration',
    'photoreal people',
    'group photo',
    'shirt mockup',
    'blurry',
    'low detail mush',
    'misspelled text',
    'extra words not in slogan',
    'watermark',
    'logo',
    'corporate clean sans only',
    'tiny unreadable text',
  ].join(', ')

  return {
    prompt,
    negativePrompt,
    promptVersion: DESIGN_PROMPT_VERSION,
    width: 2048,
    height: 2048,
  }
}
