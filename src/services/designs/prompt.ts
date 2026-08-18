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
  'clean readable typography',
  'high resolution',
  'funny sarcastic merch aesthetic for adults without explicit sexual content',
]

export function buildDesignPrompt(input: DesignPromptInput): BuiltDesignPrompt {
  const concept = input.concept?.trim() || 'bold humorous apparel graphic'
  const prompt = [
    `Create original print-ready merch artwork for the ${input.niche} humor niche.`,
    `Primary short slogan text on the design: "${input.slogan}".`,
    `Concept: ${concept}.`,
    'The design MUST include a dominant original illustration or graphic motif (characters, objects, icons, scenes) — not typography-only / text-only layout.',
    'Visual style: trendy, flashy, high-pop streetwear energy — bold shapes, saturated accent colors, strong contrast, punchy composition that pops on a t-shirt from across the room.',
    'Keep it modern merch / drip aesthetic (clean edges, poster-like impact) while staying shirt-print friendly with usable negative space.',
    'Slogan text should be secondary to the illustration, short, and highly readable.',
    `Requirements: ${SAFETY_REQUIREMENTS.join('; ')}.`,
  ].join(' ')

  const negativePrompt = [
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
    'text only design',
    'typography only',
    'words without illustration',
    'muddy colors',
    'flat boring layout',
    'tiny unreadable text',
  ].join(', ')

  return {
    prompt,
    negativePrompt,
    promptVersion: DESIGN_PROMPT_VERSION,
    width: 1024,
    height: 1024,
  }
}
