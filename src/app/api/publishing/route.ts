import { NextResponse } from 'next/server'
import { getSessionFromCookies } from '@/lib/auth/session'
import { isMongoConfigured, connectMongo } from '@/lib/db'
import { Idea } from '@/models/Idea'
import { Design } from '@/models/Design'
import {
  createDraftFromQueueItem,
  enqueueListingForDraft,
  getPublishingQueueSnapshotAsync,
} from '@/services/publishing/draftFromApproval'
import { getEnv } from '@/lib/env'
import type { Niche } from '@/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  const session = await getSessionFromCookies()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  return NextResponse.json({ ok: true, items: await getPublishingQueueSnapshotAsync() })
}

export async function POST(request: Request) {
  const session = await getSessionFromCookies()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const action = (body as { action?: string }).action

  if (action === 'create_draft_from_idea') {
    const ideaId =
      typeof (body as { ideaId?: string }).ideaId === 'string'
        ? (body as { ideaId: string }).ideaId
        : ''
    if (!ideaId) return NextResponse.json({ error: 'ideaId required' }, { status: 400 })
    if (!isMongoConfigured()) {
      return NextResponse.json({ error: 'mongo_required' }, { status: 503 })
    }

    await connectMongo()
    const idea = await Idea.findById(ideaId)
    if (!idea) return NextResponse.json({ error: 'idea_not_found' }, { status: 404 })
    if (idea.status !== 'approved' && idea.provenance?.safetyDecision !== 'PASS') {
      return NextResponse.json(
        { error: 'idea_not_approved', message: 'Approve the idea first and ensure safety PASS.' },
        { status: 400 }
      )
    }
    if (idea.provenance?.safetyDecision === 'REJECT') {
      return NextResponse.json({ error: 'rejected_blocked' }, { status: 400 })
    }

    const design = await Design.findOne({ ideaId: String(idea._id) }).sort({ createdAt: -1 })
    const mediaUrls = design
      ? [design.assetUrl, ...(design.mockupKeys || [])].filter(Boolean)
      : [
          `/api/design-preview?slogan=${encodeURIComponent(idea.slogan)}&niche=${idea.niche}&view=artwork`,
          `/api/design-preview?slogan=${encodeURIComponent(idea.slogan)}&niche=${idea.niche}&view=mockup`,
        ]

    const queued = enqueueListingForDraft({
      niche: idea.niche as Niche,
      slogan: idea.slogan,
      concept: idea.concept || '',
      mediaUrls,
      sloganSafety: 'PASS',
      imageSafety: design?.imageReviewDecision === 'REJECT' ? 'REJECT' : 'PASS',
      qualityScore: Math.max(
        design?.qualityScore ?? 0,
        idea.provenance?.qualityScore ?? 0,
        getEnv().MIN_DESIGN_QUALITY_SCORE
      ),
      ideaId: String(idea._id),
      designId: design ? String(design._id) : undefined,
      storeId: String(idea.storeId),
      brandId: String(idea.brandId),
    })

    try {
      const processed = await createDraftFromQueueItem(queued.idempotencyKey)
      return NextResponse.json({
        ok: true,
        item: {
          id: processed.id,
          status: processed.status,
          idempotencyKey: processed.idempotencyKey,
          tags: processed.payload.tags,
          lastError: processed.lastError,
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return NextResponse.json({ error: 'draft_failed', message, queued: queued.id }, { status: 502 })
    }
  }

  if (action === 'create_draft') {
    const key =
      typeof (body as { idempotencyKey?: string }).idempotencyKey === 'string'
        ? (body as { idempotencyKey: string }).idempotencyKey
        : ''
    if (!key) return NextResponse.json({ error: 'idempotencyKey required' }, { status: 400 })
    try {
      const processed = await createDraftFromQueueItem(key)
      return NextResponse.json({
        ok: true,
        item: {
          id: processed.id,
          status: processed.status,
          idempotencyKey: processed.idempotencyKey,
          tags: processed.payload.tags,
          lastError: processed.lastError,
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return NextResponse.json({ error: 'draft_failed', message }, { status: 502 })
    }
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
}
