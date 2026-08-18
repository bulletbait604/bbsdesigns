import { NextResponse } from 'next/server'
import { getSessionFromCookies } from '@/lib/auth/session'
import {
  AUTOMATION_JOBS,
  enqueueJob,
  hydrateAutomationRunsFromMongo,
  listJobStates,
  listRuns,
  pauseJob,
  resumeJob,
  retryRun,
  getRun,
} from '@/services/automation'
import type { AutomationJobName } from '@/services/automation/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function snapshot() {
  await hydrateAutomationRunsFromMongo()
  return {
    jobs: AUTOMATION_JOBS,
    states: listJobStates(),
    runs: listRuns(),
  }
}

export async function GET() {
  const session = await getSessionFromCookies()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  return NextResponse.json(await snapshot())
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

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const action = (body as { action?: string }).action
  const jobName = (body as { jobName?: AutomationJobName }).jobName
  const runId = (body as { runId?: string }).runId

  try {
    if (action === 'run_now') {
      if (!jobName) return NextResponse.json({ error: 'jobName_required' }, { status: 400 })
      // Unique key per click (handled in enqueueJob for manual). Respect pause.
      const run = await enqueueJob({ jobName, trigger: 'manual' })
      return NextResponse.json({ ...(await snapshot()), run })
    }

    if (action === 'pause') {
      if (!jobName) return NextResponse.json({ error: 'jobName_required' }, { status: 400 })
      pauseJob(jobName)
      return NextResponse.json(await snapshot())
    }

    if (action === 'resume') {
      if (!jobName) return NextResponse.json({ error: 'jobName_required' }, { status: 400 })
      resumeJob(jobName)
      return NextResponse.json(await snapshot())
    }

    if (action === 'retry') {
      if (!runId) return NextResponse.json({ error: 'runId_required' }, { status: 400 })
      const run = await retryRun(runId)
      return NextResponse.json({ ...(await snapshot()), run })
    }

    if (action === 'view_logs') {
      if (!runId) return NextResponse.json({ error: 'runId_required' }, { status: 400 })
      await hydrateAutomationRunsFromMongo()
      const run = getRun(runId)
      if (!run) return NextResponse.json({ error: 'not_found' }, { status: 404 })
      return NextResponse.json({ run })
    }

    if (action === 'purge_viral_state' || action === 'factory_reset') {
      const { runViralStatePurgeJob } = await import('@/services/pipeline/jobs')
      const purgeStats = await runViralStatePurgeJob()
      return NextResponse.json({
        ...(await snapshot()),
        purge: purgeStats,
        next: 'Run Trend research, then Idea generation, then Design generation for a fresh pipeline.',
      })
    }

    return NextResponse.json({ error: 'unknown_action' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
