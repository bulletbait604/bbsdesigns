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
    `Primary text on the design: "${input.slogan}".`,
    `Concept: ${concept}.`,
    `Requirements: ${SAFETY_REQUIREMENTS.join('; ')}.`,
    'Prefer strong contrast, simple shapes, and shirt-friendly negative space.',
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
  ].join(', ')

  return {
    prompt,
    negativePrompt,
    promptVersion: DESIGN_PROMPT_VERSION,
    width: 2048,
    height: 2048,
  }
}
