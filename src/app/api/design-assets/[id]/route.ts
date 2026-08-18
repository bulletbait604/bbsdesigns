import { NextResponse } from 'next/server'
import { getSessionFromCookies } from '@/lib/auth/session'
import { getDesignAsset } from '@/services/designs/assetStore'
import { getCachedDesignBytes } from '@/services/designs/cache'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookies()
  if (!session) return new NextResponse('unauthorized', { status: 401 })

  const { id } = await context.params

  const memory = getDesignAsset(id)
  if (memory) {
    return new NextResponse(new Uint8Array(memory.bytes), {
      headers: {
        'Content-Type': memory.mimeType,
        'Cache-Control': 'private, max-age=600',
        'X-Design-Cache': 'memory',
      },
    })
  }

  const mongo = await getCachedDesignBytes(id)
  if (mongo) {
    return new NextResponse(new Uint8Array(mongo.bytes), {
      headers: {
        'Content-Type': mongo.mimeType,
        'Cache-Control': 'private, max-age=600',
        'X-Design-Cache': 'mongodb',
      },
    })
  }

  return new NextResponse('not found', { status: 404 })
}
