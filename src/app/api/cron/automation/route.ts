import { NextResponse } from 'next/server'
import { runScheduledBucket } from '@/services/automation'

export const dynamic = 'force-dynamic'

/**
 * Optional Vercel Cron / external scheduler entrypoint.
 * Protect with CRON_SECRET when set: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization') || ''
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const runs = await runScheduledBucket()
  return NextResponse.json({
    ok: true,
    count: runs.length,
    runs: runs.map((r) => ({
      id: r.id,
      jobName: r.jobName,
      status: r.status,
      summary: r.summary,
    })),
  })
}
