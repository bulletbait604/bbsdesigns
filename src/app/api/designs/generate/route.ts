import { NextResponse } from 'next/server'
import { getSessionFromCookies } from '@/lib/auth/session'
import { isMongoConfigured } from '@/lib/db'
import { bootstrapProviders } from '@/providers/bootstrap'
import { tryGetProvider } from '@/providers/registry'
import { runDesignEngine } from '@/services/designs/engine'
import { storeDesignAsset } from '@/services/designs/assetStore'
import {
  buildDesignCacheKey,
  findCachedDesign,
  saveCachedDesign,
} from '@/services/designs/cache'
import { upsertDesignResult } from '@/services/designs/persist'
import { ensureDefaultCatalog } from '@/services/catalog/defaults'
import { DESIGN_PROMPT_VERSION } from '@/services/designs/types'
import type { Niche } from '@/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  const session = await getSessionFromCookies()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const slogan =
    typeof (body as { slogan?: string }).slogan === 'string'
      ? (body as { slogan: string }).slogan.trim()
      : ''
  const niche = (body as { niche?: Niche }).niche
  const concept =
    typeof (body as { concept?: string }).concept === 'string'
      ? (body as { concept: string }).concept.trim()
      : undefined
  const ideaId =
    typeof (body as { ideaId?: string }).ideaId === 'string'
      ? (body as { ideaId: string }).ideaId.trim()
      : ''
  const force = Boolean((body as { force?: boolean }).force)

  if (!slogan || !niche || !['gaming', 'baseball', 'softball'].includes(niche)) {
    return NextResponse.json(
      { error: 'slogan and niche (gaming|baseball|softball) required' },
      { status: 400 }
    )
  }

  const illustrationConcept =
    concept ||
    `Visual: maximalist original ${niche} cartoon hero locked into flashy bubble/varsity lettering — inseparable art+text, neon accents, heavy drop shadows, chest-filling POD print.`

  const cacheKey = buildDesignCacheKey({
    niche,
    slogan,
    concept: illustrationConcept,
  })

  if (!force) {
    const cached = await findCachedDesign(cacheKey)
    if (
      cached &&
      cached.design.mimeType !== 'image/svg+xml' &&
      cached.design.promptVersion === DESIGN_PROMPT_VERSION
    ) {
      storeDesignAsset({
        bytes: cached.bytes,
        mimeType: cached.design.mimeType,
        slogan,
        niche,
        id: cached.id,
      })
      return NextResponse.json({
        ok: true,
        fromCache: true,
        mongoCaching: isMongoConfigured(),
        design: cached.design,
        review: cached.review,
        publishAllowed: false,
        previewUrl: cached.previewUrl,
        cacheKey,
      })
    }
  }

  bootstrapProviders()
  const image = tryGetProvider('image')
  if (!image || !image.validateConfig().ok || image.name.includes('stub')) {
    return NextResponse.json(
      {
        error: 'image_provider_not_configured',
        message:
          'Set IMAGE_PROVIDER=google and IMAGE_API_KEY / GEMINI_API, then redeploy. Without Google image keys you only get SVG placeholders.',
      },
      { status: 503 }
    )
  }

  try {
    const result = await runDesignEngine({
      slogan,
      niche,
      concept: illustrationConcept,
      ideaId: ideaId || undefined,
    })
    const mongoId = await saveCachedDesign({
      cacheKey,
      niche,
      slogan,
      concept: illustrationConcept,
      result,
    })

    if (!mongoId) {
      return NextResponse.json(
        {
          error: 'design_cache_save_failed',
          message:
            'Image generated but could not be saved to Mongo — set MONGODB_URI so previews survive reloads.',
        },
        { status: 502 }
      )
    }

    const stored = storeDesignAsset({
      bytes: result.bytes,
      mimeType: result.design.mimeType,
      slogan,
      niche,
      id: mongoId,
    })

    const previewUrl = `/api/design-assets/${stored.id}`
    result.design.assetUrl = previewUrl
    result.design.assetKey = stored.id

    if (ideaId && isMongoConfigured()) {
      const catalog = await ensureDefaultCatalog()
      if (catalog) {
        await upsertDesignResult({
          result,
          storeId: catalog.storeId,
          brandId: catalog.brandId,
          ideaId,
        })
      }
    }

    return NextResponse.json({
      ok: true,
      fromCache: false,
      mongoCaching: Boolean(mongoId),
      design: result.design,
      review: result.review,
      publishAllowed: false,
      previewUrl,
      cacheKey,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const details =
      error instanceof Error && 'details' in error
        ? (error as { details?: unknown }).details
        : undefined
    return NextResponse.json(
      {
        error: message,
        message,
        details,
      },
      { status: 502 }
    )
  }
}
