import { getEnv } from '@/lib/env'
import { getProvider, tryGetProvider } from '@/providers/registry'
import { callProvider } from '@/providers/call'
import { buildDesignPrompt } from '@/services/designs/prompt'
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
 * Design engine: one AI image with imagery + slogan text integrated together.
 * Viral / eye-catching merch — never marks designs as auto-publishable.
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

  const key = `designs/${input.niche}/${slug(input.slogan)}-${Date.now()}.png`
  // Dashboard serves via /api/design-assets after Mongo cache; never leave stub/local URLs.
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

  const review = reviewGeneratedImage({
    slogan: input.slogan,
    prompt: built.prompt,
    niche: input.niche,
    bytesLength: image.bytes.length,
    mimeType: image.mimeType,
    minQuality: getEnv().MIN_DESIGN_QUALITY_SCORE,
    hasCompositedTypography: false,
  })

  if (review.decision === 'REJECT') design.status = 'rejected'
  else if (review.decision === 'REVIEW' || review.decision === 'PASS') design.status = 'review'

  return {
    design,
    review,
    publishAllowed: false,
    bytes: image.bytes,
  }
}
