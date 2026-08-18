import { NextResponse } from 'next/server'
import { getSessionFromCookies } from '@/lib/auth/session'
import { getDesignAsset } from '@/services/designs/assetStore'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookies()
  if (!session) return new NextResponse('unauthorized', { status: 401 })

  const { id } = await context.params
  const asset = getDesignAsset(id)
  if (!asset) return new NextResponse('not found', { status: 404 })

  return new NextResponse(new Uint8Array(asset.bytes), {
    headers: {
      'Content-Type': asset.mimeType,
      'Cache-Control': 'private, max-age=300',
    },
  })
}
