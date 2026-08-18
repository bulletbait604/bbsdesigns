import { NextResponse } from 'next/server'
import { getSessionFromCookies } from '@/lib/auth/session'
import { isMongoConfigured, connectMongo } from '@/lib/db'
import { Idea } from '@/models/Idea'
import { Design } from '@/models/Design'
import { AuditLog } from '@/models/AuditLog'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const session = await getSessionFromCookies()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  if (!isMongoConfigured()) {
    return NextResponse.json(
      { error: 'mongo_required', message: 'Connect MONGODB_URI to approve live ideas.' },
      { status: 503 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const ideaId =
    typeof (body as { ideaId?: string }).ideaId === 'string'
      ? (body as { ideaId: string }).ideaId
      : ''
  const action = (body as { action?: string }).action

  if (!ideaId || (action !== 'approve' && action !== 'reject')) {
    return NextResponse.json({ error: 'ideaId and action (approve|reject) required' }, { status: 400 })
  }

  await connectMongo()
  const idea = await Idea.findById(ideaId)
  if (!idea) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  if (action === 'approve' && idea.provenance?.safetyDecision === 'REJECT') {
    return NextResponse.json(
      { error: 'cannot_approve_reject', message: 'REJECT always wins — cannot approve.' },
      { status: 400 }
    )
  }

  const status = action === 'approve' ? 'approved' : 'rejected'
  idea.status = status
  if (idea.provenance) {
    idea.provenance.publishStatus = status
    if (action === 'reject') {
      idea.provenance.safetyDecision = 'REJECT'
    } else {
      // Human approval elevates REVIEW → PASS for draft eligibility
      idea.provenance.safetyDecision = 'PASS'
    }
  }
  await idea.save()

  if (action === 'approve') {
    await Design.updateMany(
      { ideaId: String(idea._id) },
      {
        $set: {
          status: 'approved',
          imageReviewDecision: 'PASS',
          'provenance.publishStatus': 'approved',
          'provenance.safetyDecision': 'PASS',
        },
      }
    )
  } else {
    await Design.updateMany(
      { ideaId: String(idea._id) },
      {
        $set: {
          status: 'rejected',
          imageReviewDecision: 'REJECT',
          'provenance.publishStatus': 'rejected',
          'provenance.safetyDecision': 'REJECT',
        },
      }
    )
  }

  await AuditLog.create({
    storeId: idea.storeId,
    actor: session.username || 'admin',
    action: `safety.${action}`,
    entityType: 'idea',
    entityId: String(idea._id),
    status: 'success',
    message: `Human ${action} on idea ${idea.slogan.slice(0, 80)}`,
  })

  return NextResponse.json({ ok: true, status, ideaId: String(idea._id) })
}
