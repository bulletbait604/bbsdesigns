import { getEnv } from '@/lib/env'
import { getFeatureFlags } from '@/lib/featureFlags'
import { getProvider, tryGetProvider } from '@/providers/registry'
import { callProvider } from '@/providers/call'
import { buildDesignPrompt } from '@/services/designs/prompt'
import { reviewGeneratedImage } from '@/services/designs/imageReview'
import { generateConceptCombinations } from '@/services/researchV2/concepts'
import { buildCreativeBrief, buildImagePromptFromBrief } from '@/services/designV2/brief'
import { reviewDesignV2 } from '@/services/designV2/review'
import { DESIGN_PROMPT_V2_VERSION } from '@/services/designV2/types'
import type {
  BuiltDesignPrompt,
  DesignPipelineResult,
  DesignPromptInput,
  GeneratedDesignRecord,
} from '@/services/designs/types'

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

/** When Design V2 is on, always use creative-director briefs (not slogan-only). */
function buildPromptForInput(input: DesignPromptInput): BuiltDesignPrompt {
  const flags = getFeatureFlags()
  if (flags.useDesignV2) {
    const concepts = generateConceptCombinations({
      topic: input.slogan,
      niche: input.niche,
      limit: 1,
    })
    const concept = concepts[0]!
    const visualFromIdea = (input.concept || '').trim()
    const brief = buildCreativeBrief({
      ...concept,
      primaryText: input.slogan,
      visualStory: visualFromIdea
        ? `${visualFromIdea.slice(0, 500)}. ${concept.visualStory}`
        : concept.visualStory,
      headline: concept.headline,
    })
    const { prompt, negativePrompt } = buildImagePromptFromBrief(brief)
    return {
      prompt,
      negativePrompt,
      promptVersion: DESIGN_PROMPT_V2_VERSION,
      width: 2048,
      height: 2048,
    }
  }
  return buildDesignPrompt(input)
}

/**
 * Design engine: one AI image with imagery + slogan text integrated together.
 * USE_DESIGN_V2 → creative-director prompts + stricter review gates.
 * Never marks designs as auto-publishable.
 */
export async function runDesignEngine(
  input: DesignPromptInput
): Promise<DesignPipelineResult> {
  const built = buildPromptForInput(input)
  const imageProvider = getProvider('image')
  const flags = getFeatureFlags()

  const image = await callProvider(
    () =>
      imageProvider.generate({
        prompt: built.prompt,
        negativePrompt: built.negativePrompt,
        width: built.width,
        height: built.height,
        imageSize: (process.env.IMAGE_SIZE || '4K').trim() || '4K',
        aspectRatio: '1:1',
      }),
    {
      provider: imageProvider.name,
      kind: 'image',
      label: 'design.generate',
      retries: 1,
      timeoutMs: 180_000,
    }
  )

  const key = `designs/${input.niche}/${slug(input.slogan)}-${Date.now()}.png`
  let assetUrl = ''
  let assetKey = key

  const storage = tryGetProvider('storage')
  const storageOk =
    storage &&
    storage.validateConfig().ok &&
    !storage.name.toLowerCase().includes('stub')
  if (storageOk) {
    const stored = await callProvider(
      () =>
        storage.putObject({
          key,
          body: image.bytes,
          contentType: image.mimeType,
        }),
      {
        provider: storage.name,
        kind: 'storage',
        label: 'design.store',
        retries: 1,
        timeoutMs: 30_000,
      }
    )
    assetKey = stored.key
    assetUrl = stored.url
  }

  const design: GeneratedDesignRecord = {
    provider: image.provider,
    model: image.model,
    prompt: built.prompt,
    negativePrompt: built.negativePrompt,
    promptVersion: built.promptVersion,
    sourceIdeaId: input.ideaId,
    slogan: input.slogan,
    niche: input.niche,
    assetKey,
    assetUrl,
    mimeType: image.mimeType,
    width: image.width ?? built.width,
    height: image.height ?? built.height,
    status: 'generated',
    createdAt: new Date().toISOString(),
  }

  let review = reviewGeneratedImage({
    slogan: input.slogan,
    prompt: built.prompt,
    niche: input.niche,
    bytesLength: image.bytes.length,
    mimeType: image.mimeType,
    minQuality: getEnv().MIN_DESIGN_QUALITY_SCORE,
    hasCompositedTypography: false,
  })

  if (flags.useDesignV2) {
    const concepts = generateConceptCombinations({
      topic: input.slogan,
      niche: input.niche,
      limit: 1,
    })
    const brief = buildCreativeBrief({
      ...concepts[0]!,
      primaryText: input.slogan,
      visualStory: (input.concept || concepts[0]!.visualStory).slice(0, 500),
    })
    const v2 = reviewDesignV2({
      brief,
      prompt: built.prompt,
      negativePrompt: built.negativePrompt,
      bytesLength: image.bytes.length,
      mimeType: image.mimeType,
      qualityHint: review.qualityScore,
    })
    review = {
      ...review,
      qualityScore: v2.scores.overallScore,
      ipRisk: Math.max(review.ipRisk, v2.scores.ipRisk),
      issues: [...new Set([...review.issues, ...v2.reasons])],
      decision: v2.decision,
      threshold: v2.gates.overallMin,
    }
  }

  if (review.decision === 'REJECT') design.status = 'rejected'
  else if (review.decision === 'REVIEW' || review.decision === 'PASS') design.status = 'review'

  return {
    design,
    review,
    publishAllowed: false,
    bytes: image.bytes,
  }
}
