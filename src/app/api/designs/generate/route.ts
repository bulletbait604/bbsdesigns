import { NextResponse } from 'next/server'
import { getSessionFromCookies } from '@/lib/auth/session'
import { bootstrapProviders } from '@/providers/bootstrap'
import { tryGetProvider } from '@/providers/registry'
import { runDesignEngine } from '@/services/designs/engine'
import { storeDesignAsset } from '@/services/designs/assetStore'
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

  if (!slogan || !niche || !['gaming', 'baseball', 'softball'].includes(niche)) {
    return NextResponse.json(
      { error: 'slogan and niche (gaming|baseball|softball) required' },
      { status: 400 }
    )
  }

  bootstrapProviders()
  const image = tryGetProvider('image')
  if (!image || !image.validateConfig().ok || image.name.includes('stub')) {
    return NextResponse.json(
      {
        error: 'image_provider_not_configured',
        message:
          'Set IMAGE_PROVIDER=google and IMAGE_API_KEY to your Gemini API key from Google AI Studio, then redeploy.',
      },
      { status: 503 }
    )
  }

  try {
    const result = await runDesignEngine({ slogan, niche, concept })
    const stored = storeDesignAsset({
      bytes: result.bytes,
      mimeType: result.design.mimeType,
      slogan,
      niche,
    })

    const previewUrl = `/api/design-assets/${stored.id}`
    result.design.assetUrl = previewUrl
    result.design.assetKey = stored.id

    return NextResponse.json({
      ok: true,
      design: result.design,
      review: result.review,
      publishAllowed: false,
      previewUrl,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
