import {
  DESIGN_PROMPT_VERSION,
  type BuiltDesignPrompt,
  type DesignPromptInput,
} from '@/services/designs/types'

const SAFETY_REQUIREMENTS = [
  'original artwork only',
  'no logos',
  'no copyrighted characters',
  'no video game assets or UI chrome from real games',
  'no professional sports team marks, mascots, or jersey replicas',
  'no celebrity likenesses',
  'no watermarks',
  'no trademarks used as branding',
  'print-ready composition centered for apparel',
  'high resolution',
  'funny sarcastic merch aesthetic for adults without explicit sexual content',
]

const NICHE_MOTIFS: Record<string, string> = {
  gaming:
    'original neon arcade energy: stylized controller silhouette, pixel clouds, headset, joystick — invent original shapes, never copy a real franchise',
  baseball:
    'original ballpark energy: cracked bat sparks, dirt diamond arc, catcher mitt, stadium light flares — invent original marks, never copy real teams',
  softball:
    'original dugout energy: softball with exaggerated seams, sunburst, cleats, bench silhouette — invent original marks, never copy real teams',
}

/**
 * Illustration-first merch prompt. Text is secondary to a dominant picture/graphic.
 */
export function buildDesignPrompt(input: DesignPromptInput): BuiltDesignPrompt {
  const concept = input.concept?.trim() || 'bold humorous apparel graphic'
  const motif = NICHE_MOTIFS[input.niche] || NICHE_MOTIFS.gaming

  const prompt = [
    'Create a SINGLE square print-ready T-SHIRT GRAPHIC as a full-bleed illustrated IMAGE (not a text poster).',
    `Niche: ${input.niche} humor merch.`,
    `Include this short slogan as SMALL secondary lettering only (under ~20% of visual weight): "${input.slogan}".`,
    `Concept: ${concept}.`,
    `DOMINANT SUBJECT (required): a large original cartoon / vector illustration covering most of the canvas — ${motif}.`,
    'Composition rule: illustration first, slogan second. The eye must land on a picture/character/object scene, NOT on words.',
    'FORBIDDEN: typography-only layouts, wordmarks alone, blank backgrounds with centered slogan, quote-card designs, minimal text posters.',
    'Style: trendy flashy high-pop streetwear — bold shapes, saturated accents, strong contrast, clean edges, shirt-print friendly negative space.',
    'Output one cohesive graphic suitable for DTG/screen print on apparel.',
    `Requirements: ${SAFETY_REQUIREMENTS.join('; ')}.`,
  ].join(' ')

  const negativePrompt = [
    'text only',
    'typography only',
    'words without illustration',
    'slogan centered on empty background',
    'quote card',
    'minimal poster with just text',
    'logo',
    'trademark',
    'copyrighted character',
    'celebrity face',
    'sports team mark',
    'jersey number branding',
    'watermark',
    'nsfw',
    'gore',
    'hate symbol',
    'low resolution',
    'blurry text',
    'misspelled text',
    'muddy colors',
    'tiny unreadable text',
    'photorealistic branded products',
  ].join(', ')

  return {
    prompt,
    negativePrompt,
    promptVersion: DESIGN_PROMPT_VERSION,
    width: 1024,
    height: 1024,
  }
}
