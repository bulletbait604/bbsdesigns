import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { getSessionFromCookies } from '@/lib/auth/session'
import { getDesignAsset } from '@/services/designs/assetStore'
import { getCachedDesignBytes } from '@/services/designs/cache'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Vercel serverless responses fail around 4.5MB — keep dashboard previews under this. */
const MAX_SERVE_BYTES = 3_500_000

async function toDashboardPreview(
  bytes: Buffer,
  mimeType: string
): Promise<{ bytes: Buffer; mimeType: string }> {
  if (bytes.length <= MAX_SERVE_BYTES) {
    return { bytes, mimeType }
  }

  try {
    const png = await sharp(bytes)
      .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 8 })
      .toBuffer()

    if (png.length <= MAX_SERVE_BYTES) {
      logger.info('design_asset_downscaled', {
        fromBytes: bytes.length,
        toBytes: png.length,
        format: 'png',
      })
      return { bytes: png, mimeType: 'image/png' }
    }

    const jpeg = await sharp(bytes)
      .resize(1536, 1536, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer()

    logger.info('design_asset_downscaled', {
      fromBytes: bytes.length,
      toBytes: jpeg.length,
      format: 'jpeg',
    })
    return { bytes: jpeg, mimeType: 'image/jpeg' }
  } catch (error) {
    logger.warn('design_asset_downscale_failed', {
      error: error instanceof Error ? error.message : String(error),
      bytes: bytes.length,
    })
    return { bytes, mimeType }
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookies()
  if (!session) return new NextResponse('unauthorized', { status: 401 })

  const { id } = await context.params

  const memory = getDesignAsset(id)
  if (memory) {
    const preview = await toDashboardPreview(memory.bytes, memory.mimeType)
    return new NextResponse(new Uint8Array(preview.bytes), {
      headers: {
        'Content-Type': preview.mimeType,
        'Cache-Control': 'private, max-age=600',
        'X-Design-Cache': 'memory',
        'X-Design-Bytes': String(preview.bytes.length),
      },
    })
  }

  const mongo = await getCachedDesignBytes(id)
  if (mongo) {
    const preview = await toDashboardPreview(mongo.bytes, mongo.mimeType)
    return new NextResponse(new Uint8Array(preview.bytes), {
      headers: {
        'Content-Type': preview.mimeType,
        'Cache-Control': 'private, max-age=600',
        'X-Design-Cache': 'mongodb',
        'X-Design-Bytes': String(preview.bytes.length),
      },
    })
  }

  return new NextResponse('not found', { status: 404 })
}
