import { NextResponse } from 'next/server'
import { getDemoDesign, type DesignPreviewId } from '@/lib/demoCatalog'
import { buildArtworkSvg, buildMockupSvg } from '@/lib/svgMerch'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id') as DesignPreviewId | null
  const view = searchParams.get('view') === 'mockup' ? 'mockup' : 'artwork'

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  const design = getDemoDesign(id)
  if (!design) {
    return new NextResponse(
      `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#10233b"/><text x="200" y="200" text-anchor="middle" fill="#9db0c7" font-family="Arial" font-size="18">No design</text></svg>`,
      {
        status: 404,
        headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'no-store' },
      }
    )
  }

  if (design.safetyDecision === 'REJECT') {
    return new NextResponse(
      `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" fill="#1a1010"/><text x="400" y="380" text-anchor="middle" fill="#ff6b6b" font-family="Arial" font-size="36" font-weight="700">BLOCKED</text><text x="400" y="440" text-anchor="middle" fill="#9db0c7" font-family="Arial" font-size="18">Safety REJECT — no artwork</text></svg>`,
      {
        headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=60' },
      }
    )
  }

  const svg = view === 'mockup' ? buildMockupSvg(design) : buildArtworkSvg(design)
  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
