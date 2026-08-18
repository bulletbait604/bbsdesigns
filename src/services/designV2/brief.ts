import { listDesignStyles, type DesignStyleId } from '@/services/researchV2/styleLibrary'
import type { ConceptCombination } from '@/services/researchV2/types'
import type { CreativeBrief, TypographyTreatment } from '@/services/designV2/types'

const STYLE_TYPOGRAPHY: Partial<Record<DesignStyleId, TypographyTreatment>> = {
  vintage_americana: 'arched_headline',
  sports_poster: 'arched_headline',
  vintage_baseball_card: 'split_dimensional',
  bold_streetwear: 'stacked_kinetic',
  y2k: 'letter_as_icon',
  neon_80s: 'oversized_outline',
  retro_arcade: 'stacked_kinetic',
  comic_book: 'curved_banner',
  mascot_illustration: 'prop_locked',
  animal_illustration: 'arched_headline',
  camping_badge: 'circular_badge',
  vintage_tattoo: 'curved_banner',
  cyberpunk: 'oversized_outline',
  distressed_screenprint: 'stacked_kinetic',
  luxury_streetwear: 'oversized_outline',
  food_illustration: 'curved_banner',
}

const PALETTES: Record<string, string[]> = {
  gaming: ['electric cyan', 'hot magenta', 'acid lime', 'void black', 'white'],
  baseball: ['navy', 'cream', 'brick red', 'mustard', 'charcoal'],
  softball: ['neon yellow', 'royal purple', 'white', 'dirt brown', 'black'],
  pets: ['coral', 'cream', 'teal', 'charcoal', 'hot pink'],
  teacher: ['apple red', 'chalkboard green', 'cream', 'mustard', 'navy'],
  nurse: ['scrub teal', 'coral', 'white', 'navy', 'gold'],
  humor: ['cyan', 'lime', 'yellow', 'red', 'black'],
  retro: ['hot pink', 'aqua', 'lavender', 'chrome silver', 'black'],
  bookish: ['burgundy', 'cream', 'forest', 'gold', 'ink black'],
}

function styleLabel(id: string): string {
  return listDesignStyles().find((s) => s.id === id)?.label || id
}

function styleBrief(id: string): string {
  return listDesignStyles().find((s) => s.id === id)?.brief || 'Bold commercial merch graphic'
}

export function buildCreativeBrief(concept: ConceptCombination): CreativeBrief {
  const styleId = String(concept.recommendedStyleId)
  const typographyTreatment =
    STYLE_TYPOGRAPHY[styleId as DesignStyleId] || ('stacked_kinetic' as TypographyTreatment)

  // Visual vs type dominance — prefer visual-led for mascot/illustration styles
  const visualLed = [
    'mascot_illustration',
    'animal_illustration',
    'comic_book',
    'food_illustration',
    'sports_poster',
  ].includes(styleId)
  const visualDominancePct = visualLed ? 65 : 45
  const typographyDominancePct = 100 - visualDominancePct

  return {
    product: concept.product,
    targetAudience: concept.audience,
    trend: concept.trend,
    conceptHeadline: concept.headline,
    styleId,
    styleLabel: styleLabel(styleId),
    primaryText: concept.primaryText,
    secondaryText: concept.secondaryText,
    visualStory: concept.visualStory,
    character: `Original ${concept.niche} character embodying "${concept.humor}" — invent shapes, never real IP`,
    pose: visualLed ? 'dynamic oversized pose filling the chest print area' : 'graphic woven through typography',
    expression: 'exaggerated, readable from 10 feet, merch-friendly',
    colors: PALETTES[concept.niche] || PALETTES.humor,
    composition: [
      styleBrief(styleId),
      `Visual dominance ~${visualDominancePct}%, typography ~${typographyDominancePct}%.`,
      'Art and text must feel like ONE designed composition — never text slapped under a floating icon.',
      'Strong silhouette, print-ready, transparent or dark void background.',
    ].join(' '),
    typographyTreatment,
    visualDominancePct,
    typographyDominancePct,
    printNotes: 'Screenprint-friendly limited palette, thick outlines, high contrast, no micro-detail mush.',
    niche: concept.niche,
    conceptId: concept.id,
  }
}

export function buildImagePromptFromBrief(brief: CreativeBrief): {
  prompt: string
  negativePrompt: string
} {
  const prompt = [
    'CREATE AN ORIGINAL COMMERCIAL APPAREL GRAPHIC.',
    '',
    `PRODUCT PURPOSE: ${brief.product} merch for ${brief.targetAudience}.`,
    `TREND / NICHE: ${brief.trend} (${brief.niche}).`,
    `CONCEPT: ${brief.conceptHeadline}.`,
    `STYLE: ${brief.styleLabel} — ${styleBrief(String(brief.styleId))}`,
    '',
    'SUBJECT / VISUAL STORY:',
    brief.visualStory,
    '',
    `CHARACTER: ${brief.character}`,
    `POSE: ${brief.pose}`,
    `EXPRESSION: ${brief.expression}`,
    '',
    `PRIMARY TYPOGRAPHY: "${brief.primaryText}"`,
    `TYPOGRAPHY TREATMENT: ${brief.typographyTreatment.replace(/_/g, ' ')}`,
    `SECONDARY TYPOGRAPHY: "${brief.secondaryText}"`,
    '',
    `COMPOSITION: ${brief.composition}`,
    `COLOR PALETTE: ${brief.colors.join(', ')} (4-6 coordinated colors).`,
    'DETAILS: layered decorative elements, foreground/background separation, supporting motifs in corners, flames/lightning/stars/speed lines ONLY when style-appropriate and original.',
    'TEXTURE: distressed ink / halftone / sticker edge / chrome outline as fits style — still print-clean.',
    `PRINT STYLE: ${brief.printNotes}`,
    '',
    'OUTPUT:',
    'transparent or solid dark void background',
    'high resolution',
    'strong silhouette',
    'professional apparel graphic',
    'centered chest composition',
    'print-ready',
    'typography INTEGRATED into the illustration — not a caption underneath',
  ].join('\n')

  const negativePrompt = [
    'no logos',
    'no trademarks',
    'no copyrighted characters',
    'no celebrity likenesses',
    'no watermarks',
    'no random illegible text',
    'no misspelled words',
    'no generic clip art',
    'no boring minimalist plain-text-only design',
    'no tiny unreadable text',
    'no white empty background with centered black slogan only',
    'no Canva template look',
    'no simple text inside a circle as the whole design',
    'no real NFL NBA MLB NHL NCAA team marks',
    'no Disney Marvel Pokemon Nintendo Sony franchise characters',
  ].join(', ')

  return { prompt, negativePrompt }
}
