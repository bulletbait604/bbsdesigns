import { NextResponse } from 'next/server'
import {
  hydrateAutomationRunsFromMongo,
  runScheduledBucket,
} from '@/services/automation'
import { assessAutonomyReadiness } from '@/services/automation/readiness'

export const dynamic = 'force-dynamic'
/** Full daily bucket may include several Gemini image calls — needs Pro/Fluid ≥300s. */
export const maxDuration = 300

/**
 * Vercel Cron / external scheduler entrypoint.
 * Protect with CRON_SECRET when set: Authorization: Bearer <CRON_SECRET>
 * (Vercel Cron sends this automatically when CRON_SECRET is configured.)
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization') || ''
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  await hydrateAutomationRunsFromMongo()
  const readiness = assessAutonomyReadiness()
  const runs = await runScheduledBucket()

  return NextResponse.json({
    ok: true,
    count: runs.length,
    readiness: {
      readyForAutonomousGeneration: readiness.readyForAutonomousGeneration,
      textDesigns: readiness.textDesigns.ready,
      imageDesigns: readiness.imageDesigns.ready,
      blockers: readiness.blockers,
    },
    runs: runs.map((r) => ({
      id: r.id,
      jobName: r.jobName,
      status: r.status,
      summary: r.summary,
    })),
  })
}
