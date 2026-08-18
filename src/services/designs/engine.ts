import { getEnv } from '@/lib/env'
import { getProvider, tryGetProvider } from '@/providers/registry'
import { callProvider } from '@/providers/call'
import { buildDesignPrompt } from '@/services/designs/prompt'
import { composeGraphicWithSlogan } from '@/services/designs/composeMerch'
import { reviewGeneratedImage } from '@/services/designs/imageReview'
import type {
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

/**
 * Design engine (starter 009): AI graphic → clean typography composite → image review.
 * Always produces graphics WITH text (composited), never text-only posters.
 * Never marks designs as auto-publishable.
 */
export async function runDesignEngine(
  input: DesignPromptInput
): Promise<DesignPipelineResult> {
  const built = buildDesignPrompt(input)
  const imageProvider = getProvider('image')

  const image = await callProvider(
    () =>
      imageProvider.generate({
        prompt: built.prompt,
        negativePrompt: built.negativePrompt,
        width: built.width,
        height: built.height,
        imageSize: (process.env.IMAGE_SIZE || '2K').trim() || '2K',
        aspectRatio: '1:1',
      }),
    {
      provider: imageProvider.name,
      kind: 'image',
      label: 'design.generate',
      retries: 1,
      timeoutMs: 90_000,
    }
  )

  // Starter requirement: original artwork + clean typography
  const composed = await composeGraphicWithSlogan({
    artBytes: image.bytes,
    slogan: input.slogan,
    niche: input.niche,
    size: 2048,
  })

  const key = `designs/${input.niche}/${slug(input.slogan)}-${Date.now()}.png`
  let assetUrl = `local://${key}`
  let assetKey = key

  const storage = tryGetProvider('storage')
  if (storage && storage.validateConfig().ok) {
    const stored = await callProvider(
      () =>
        storage.putObject({
          key,
          body: composed.bytes,
          contentType: composed.mimeType,
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
    model: `${image.model}+compose-typo`,
    prompt: built.prompt,
    negativePrompt: built.negativePrompt,
    promptVersion: built.promptVersion,
    sourceIdeaId: input.ideaId,
    slogan: input.slogan,
    niche: input.niche,
    assetKey,
    assetUrl,
    mimeType: composed.mimeType,
    width: composed.width,
    height: composed.height,
    status: 'generated',
    createdAt: new Date().toISOString(),
  }

  const review = reviewGeneratedImage({
    slogan: input.slogan,
    prompt: `${built.prompt} clean typography composite graphic with text`,
    niche: input.niche,
    bytesLength: composed.bytes.length,
    mimeType: composed.mimeType,
    minQuality: getEnv().MIN_DESIGN_QUALITY_SCORE,
    hasCompositedTypography: true,
  })

  if (review.decision === 'REJECT') design.status = 'rejected'
  else if (review.decision === 'REVIEW' || review.decision === 'PASS') design.status = 'review'

  return {
    design,
    review,
    publishAllowed: false,
    bytes: composed.bytes,
  }
}
