import { createHash, randomUUID } from 'crypto'
import { getEnv } from '@/lib/env'
import { logger } from '@/lib/logger'
import { withRetry } from '@/lib/retry'
import { AUTOMATION_JOBS, getJobDefinition } from '@/services/automation/jobs'
import type {
  AutomationJobName,
  AutomationJobState,
  AutomationRunRecord,
  AutomationTrigger,
} from '@/services/automation/types'
import { seedDemoAnalytics, buildWeeklyReport } from '@/services/analytics'
import {
  findAutomationRunById,
  findAutomationRunByIdempotencyKey,
  listAutomationRunsFromMongo,
  persistAutomationRun,
} from '@/services/automation/persist'

const runs = new Map<string, AutomationRunRecord>()
const jobState = new Map<AutomationJobName, AutomationJobState>()

function ensureJobState(name: AutomationJobName): AutomationJobState {
  let state = jobState.get(name)
  if (!state) {
    state = { name, paused: false }
    jobState.set(name, state)
  }
  return state
}

for (const job of AUTOMATION_JOBS) {
  ensureJobState(job.name)
}

export function clearAutomationMemory(): void {
  runs.clear()
  jobState.clear()
  for (const job of AUTOMATION_JOBS) {
    ensureJobState(job.name)
  }
}

/** Pull recent Mongo runs into the in-memory cache (Vercel-safe list). */
export async function hydrateAutomationRunsFromMongo(): Promise<void> {
  const mongoRuns = await listAutomationRunsFromMongo(80)
  for (const run of mongoRuns) {
    if (!runs.has(run.id)) runs.set(run.id, run)
  }
}

function buildIdempotencyKey(jobName: AutomationJobName, bucket: string): string {
  return createHash('sha256').update(`${jobName}|${bucket}`).digest('hex').slice(0, 32)
}

function dayBucket(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}

function appendLog(run: AutomationRunRecord, line: string): void {
  run.logs.push(`${new Date().toISOString()} ${line}`)
}

/**
 * Execute a job handler. Publishing respects HUMAN_APPROVAL + AUTO_PUBLISH.
 */
async function executeJob(jobName: AutomationJobName, run: AutomationRunRecord): Promise<void> {
  const env = getEnv()
  const def = getJobDefinition(jobName)

  if (def.requiresHumanApprovalGate && env.HUMAN_APPROVAL && !env.AUTO_PUBLISH) {
    run.status = 'skipped'
    run.summary = 'Skipped — HUMAN_APPROVAL=true and AUTO_PUBLISH=false'
    appendLog(run, 'gate:skip_human_approval')
    return
  }

  await withRetry(
    `automation:${jobName}`,
    async () => {
      appendLog(run, `execute:${jobName}`)

      switch (jobName) {
        case 'trend_ingestion':
        case 'trend_scoring': {
          const { runTrendPersistJob } = await import('@/services/pipeline/jobs')
          const stats = await runTrendPersistJob()
          run.stats = stats
          run.summary = `Scored ${stats.scored ?? 0} trend(s); persisted ${stats.persisted ?? 0}`
          appendLog(run, `trends:${stats.scored}`)
          break
        }
        case 'idea_generation': {
          const { runIdeaGenerationJob } = await import('@/services/pipeline/jobs')
          const stats = await runIdeaGenerationJob()
          run.stats = stats
          run.summary = `Generated ${stats.generated ?? 0} slogans; accepted ${stats.accepted ?? 0}; persisted ${stats.persisted ?? 0}`
          break
        }
        case 'safety_review': {
          const { runSafetyReviewJob } = await import('@/services/pipeline/jobs')
          const stats = await runSafetyReviewJob()
          run.stats = stats
          run.summary = stats.skipped
            ? 'Safety review skipped (Mongo not configured)'
            : `Reviewed ${stats.reviewed ?? 0} ideas (PASS ${stats.pass} / REVIEW ${stats.review} / REJECT ${stats.reject})`
          break
        }
        case 'design_generation': {
          const { runDesignGenerationJob } = await import('@/services/pipeline/jobs')
          const stats = await runDesignGenerationJob()
          run.stats = stats
          run.summary = stats.skipped
            ? 'Design generation skipped (Mongo not configured)'
            : `Created ${stats.created ?? 0} designs (AI ${stats.aiUsed}, cache ${stats.cached}, SVG ${stats.svgFallback})`
          break
        }
        case 'image_review': {
          const { runImageReviewJob } = await import('@/services/pipeline/jobs')
          const stats = await runImageReviewJob()
          run.stats = stats
          run.summary = stats.skipped
            ? 'Image review skipped (Mongo not configured)'
            : `Reviewed ${stats.reviewed ?? 0} designs`
          break
        }
        case 'mockups': {
          const { runMockupsJob } = await import('@/services/pipeline/jobs')
          const stats = await runMockupsJob()
          run.stats = stats
          run.summary = stats.skipped
            ? 'Mockups skipped (Mongo not configured)'
            : `Updated mockups on ${stats.updated ?? 0} design(s)`
          break
        }
        case 'listing_preparation': {
          const { runListingPreparationJob } = await import('@/services/pipeline/jobs')
          const stats = await runListingPreparationJob()
          run.stats = stats
          run.summary = stats.skipped
            ? 'Listing prep skipped (Mongo not configured)'
            : `Enqueued ${stats.enqueued ?? 0} listing(s); ${stats.ready ?? 0} READY_FOR_REVIEW`
          break
        }
        case 'analytics_sync': {
          const report = seedDemoAnalytics()
          run.stats = { products: report.products.length, orders: report.totals.orders }
          run.summary = `Synced ${report.products.length} product metric row(s)`
          break
        }
        case 'retirement_candidates': {
          const report = buildWeeklyReport()
          const retire = report.products.filter((p) => p.decision === 'RETIRE_CANDIDATE')
          run.stats = { retireCandidates: retire.length }
          run.summary = `Flagged ${retire.length} RETIRE_CANDIDATE (no deletes)`
          appendLog(run, 'no_auto_delete')
          break
        }
        case 'weekly_report': {
          const report = buildWeeklyReport()
          run.stats = { reportId: report.id, products: report.products.length }
          run.summary = `Weekly report ${report.id} (${report.products.length} products)`
          break
        }
        case 'publishing': {
          const { runPublishingGateJob } = await import('@/services/pipeline/jobs')
          const stats = await runPublishingGateJob()
          run.stats = stats
          run.summary = 'Publishing gated — manual approval required (AUTO_PUBLISH=false)'
          break
        }
        default: {
          run.summary = `${def.label} completed`
          run.stats = {}
          break
        }
      }
    },
    { retries: 2, baseDelayMs: 10 }
  )

  if (run.status === 'running') {
    run.status = 'succeeded'
  }
}

export function listJobStates(): AutomationJobState[] {
  return AUTOMATION_JOBS.map((j) => ensureJobState(j.name))
}

export function listRuns(limit = 50): AutomationRunRecord[] {
  return [...runs.values()]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
}

export function getRun(id: string): AutomationRunRecord | undefined {
  return runs.get(id)
}

export function pauseJob(name: AutomationJobName): AutomationJobState {
  const state = ensureJobState(name)
  state.paused = true
  logger.info('automation_paused', { job: name })
  return state
}

export function resumeJob(name: AutomationJobName): AutomationJobState {
  const state = ensureJobState(name)
  state.paused = false
  logger.info('automation_resumed', { job: name })
  return state
}

export async function enqueueJob(opts: {
  jobName: AutomationJobName
  trigger?: AutomationTrigger
  idempotencyKey?: string
  force?: boolean
}): Promise<AutomationRunRecord> {
  const { jobName, trigger = 'manual', force = false } = opts
  getJobDefinition(jobName)
  const state = ensureJobState(jobName)

  if (state.paused && !force) {
    const skipped: AutomationRunRecord = {
      id: `run_${randomUUID().slice(0, 12)}`,
      jobName,
      idempotencyKey: opts.idempotencyKey || buildIdempotencyKey(jobName, `paused|${dayBucket()}`),
      status: 'paused',
      trigger,
      attempt: 0,
      maxAttempts: 3,
      summary: 'Job is paused',
      logs: [`${new Date().toISOString()} paused`],
      createdAt: new Date().toISOString(),
    }
    runs.set(skipped.id, skipped)
    void persistAutomationRun(skipped)
    return skipped
  }

  const idempotencyKey =
    opts.idempotencyKey || buildIdempotencyKey(jobName, `${trigger}|${dayBucket()}`)

  const existing = [...runs.values()].find(
    (r) =>
      r.idempotencyKey === idempotencyKey &&
      (r.status === 'succeeded' ||
        r.status === 'running' ||
        r.status === 'queued' ||
        r.status === 'skipped')
  )
  if (existing) {
    logger.info('automation_idempotent_hit', { id: existing.id, job: jobName })
    return existing
  }

  const fromMongo = await findAutomationRunByIdempotencyKey(idempotencyKey)
  if (
    fromMongo &&
    (fromMongo.status === 'succeeded' ||
      fromMongo.status === 'running' ||
      fromMongo.status === 'queued' ||
      fromMongo.status === 'skipped')
  ) {
    runs.set(fromMongo.id, fromMongo)
    logger.info('automation_idempotent_hit', { id: fromMongo.id, job: jobName, source: 'mongo' })
    return fromMongo
  }

  const run: AutomationRunRecord = {
    id: `run_${createHash('sha256').update(idempotencyKey).digest('hex').slice(0, 16)}`,
    jobName,
    idempotencyKey,
    status: 'queued',
    trigger,
    attempt: 0,
    maxAttempts: 3,
    summary: '',
    logs: [],
    createdAt: new Date().toISOString(),
  }
  runs.set(run.id, run)
  await persistAutomationRun(run)

  return processRun(run.id)
}

export async function processRun(runId: string): Promise<AutomationRunRecord> {
  let run = runs.get(runId)
  if (!run) {
    const fromMongo = await findAutomationRunById(runId)
    if (fromMongo) {
      runs.set(fromMongo.id, fromMongo)
      run = fromMongo
    }
  }
  if (!run) throw new Error(`Run not found: ${runId}`)

  if (run.status === 'succeeded' || run.status === 'skipped') return run

  const state = ensureJobState(run.jobName)
  run.status = 'running'
  run.attempt += 1
  run.startedAt = new Date().toISOString()
  run.error = null
  appendLog(run, `start attempt=${run.attempt}`)
  await persistAutomationRun(run)

  try {
    await executeJob(run.jobName, run)
    if (run.status === 'running') run.status = 'succeeded'
    run.finishedAt = new Date().toISOString()
    appendLog(run, `finish status=${run.status}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    run.error = message
    run.finishedAt = new Date().toISOString()
    if (run.attempt >= run.maxAttempts) {
      run.status = 'failed'
      run.summary = `Failed after ${run.attempt} attempts: ${message}`
      appendLog(run, `failed:${message}`)
    } else {
      run.status = 'queued'
      run.summary = `Retry scheduled after error: ${message}`
      appendLog(run, `retryable_error:${message}`)
    }
  }

  state.lastRunId = run.id
  state.lastStatus = run.status
  state.lastFinishedAt = run.finishedAt || undefined

  logger.info('automation_run', {
    id: run.id,
    job: run.jobName,
    status: run.status,
    trigger: run.trigger,
  })

  await persistAutomationRun(run)
  return run
}

export async function retryRun(runId: string): Promise<AutomationRunRecord> {
  let prior = runs.get(runId)
  if (!prior) {
    prior = (await findAutomationRunById(runId)) || undefined
    if (prior) runs.set(prior.id, prior)
  }
  if (!prior) throw new Error(`Run not found: ${runId}`)

  return enqueueJob({
    jobName: prior.jobName,
    trigger: 'retry',
    idempotencyKey: buildIdempotencyKey(prior.jobName, `retry|${runId}|${Date.now()}`),
    force: true,
  })
}

export async function runScheduledBucket(anchor = new Date()): Promise<AutomationRunRecord[]> {
  const bucket = dayBucket(anchor)
  const results: AutomationRunRecord[] = []
  for (const job of AUTOMATION_JOBS) {
    const run = await enqueueJob({
      jobName: job.name,
      trigger: 'schedule',
      idempotencyKey: buildIdempotencyKey(job.name, `schedule|${bucket}`),
    })
    results.push(run)
  }
  return results
}
