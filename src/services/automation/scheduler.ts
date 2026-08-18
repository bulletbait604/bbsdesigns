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
import { buildWeeklyReport, syncAnalyticsMetrics } from '@/services/analytics'
import {
  findAutomationRunById,
  findAutomationRunByIdempotencyKey,
  listAutomationRunsFromMongo,
  loadAutomationJobStatesFromMongo,
  persistAutomationJobState,
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

/** Pull recent Mongo runs + pause flags into memory (Vercel-safe). */
export async function hydrateAutomationRunsFromMongo(): Promise<void> {
  const [mongoRuns, mongoStates] = await Promise.all([
    listAutomationRunsFromMongo(80),
    loadAutomationJobStatesFromMongo(),
  ])
  for (const run of mongoRuns) {
    if (!runs.has(run.id)) runs.set(run.id, run)
  }
  for (const state of mongoStates) {
    const local = ensureJobState(state.name)
    local.paused = state.paused
    if (state.lastRunId) local.lastRunId = state.lastRunId
    if (state.lastStatus) local.lastStatus = state.lastStatus
    if (state.lastFinishedAt) local.lastFinishedAt = state.lastFinishedAt
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
 * Execute a job handler. Publishing never auto-publishes while AUTO_PUBLISH=false;
 * it still reports queue/gate status so "Run now" is useful.
 */
async function executeJob(jobName: AutomationJobName, run: AutomationRunRecord): Promise<void> {
  const env = getEnv()
  const def = getJobDefinition(jobName)

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
            : `Created ${stats.created ?? 0} designs (AI ${stats.aiUsed}/${stats.aiBudget ?? '?'}, cache ${stats.cached}, upgraded ${stats.upgradedPlaceholders ?? 0}, SVG ${stats.svgFallback})`
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
          const { hydratePublishingQueueFromMongo } = await import('@/services/publishing/queue')
          await hydratePublishingQueueFromMongo()
          const { runListingPreparationJob } = await import('@/services/pipeline/jobs')
          const stats = await runListingPreparationJob()
          run.stats = stats
          run.summary = stats.skipped
            ? 'Listing prep skipped (Mongo not configured)'
            : `Enqueued ${stats.enqueued ?? 0} listing(s); ${stats.ready ?? 0} READY_FOR_REVIEW`
          break
        }
        case 'analytics_sync': {
          const synced = await syncAnalyticsMetrics()
          run.stats = {
            products: synced.products,
            orders: synced.orders,
            shopifyOrders: synced.shopifyOrders,
            source: synced.source,
          }
          run.summary =
            synced.source === 'demo'
              ? `Demo fallback: ${synced.products} product metric row(s)`
              : `Synced ${synced.products} product(s), ${synced.orders} Mongo order(s), ${synced.shopifyOrders} Shopify order(s)`
          break
        }
        case 'retirement_candidates': {
          const synced = await syncAnalyticsMetrics()
          const retire = synced.report.products.filter((p) => p.decision === 'RETIRE_CANDIDATE')
          run.stats = { retireCandidates: retire.length, source: synced.source }
          run.summary = `Flagged ${retire.length} RETIRE_CANDIDATE (no deletes)`
          appendLog(run, 'no_auto_delete')
          break
        }
        case 'weekly_report': {
          const synced = await syncAnalyticsMetrics()
          const report = synced.report.products.length ? synced.report : buildWeeklyReport()
          run.stats = {
            reportId: report.id,
            products: report.products.length,
            source: synced.source,
          }
          run.summary = `Weekly report ${report.id} (${report.products.length} products)`
          break
        }
        case 'publishing': {
          const { hydratePublishingQueueFromMongo } = await import('@/services/publishing/queue')
          await hydratePublishingQueueFromMongo()
          const { runPublishingGateJob } = await import('@/services/pipeline/jobs')
          const stats = await runPublishingGateJob()
          run.stats = stats

          if (def.requiresHumanApprovalGate && env.HUMAN_APPROVAL && !env.AUTO_PUBLISH) {
            run.status = 'skipped'
            run.summary = `Publishing gated — ${stats.readyForReview ?? 0} ready; approve manually (AUTO_PUBLISH=false)`
            appendLog(run, 'gate:skip_human_approval')
          } else {
            run.summary = `Publishing gate check — ${stats.readyForReview ?? 0} ready for review`
          }
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
  void persistAutomationJobState(state)
  return state
}

export function resumeJob(name: AutomationJobName): AutomationJobState {
  const state = ensureJobState(name)
  state.paused = false
  logger.info('automation_resumed', { job: name })
  void persistAutomationJobState(state)
  return state
}

export async function enqueueJob(opts: {
  jobName: AutomationJobName
  trigger?: AutomationTrigger
  idempotencyKey?: string
  /** Bypass pause gate (retries). Does not bypass schedule-day idempotency by itself. */
  force?: boolean
}): Promise<AutomationRunRecord> {
  const { jobName, trigger = 'manual', force = false } = opts
  getJobDefinition(jobName)
  const state = ensureJobState(jobName)

  if (state.paused && !force) {
    const skipped: AutomationRunRecord = {
      id: `run_${randomUUID().slice(0, 12)}`,
      jobName,
      idempotencyKey:
        opts.idempotencyKey ||
        buildIdempotencyKey(jobName, `paused|${dayBucket()}|${Date.now()}`),
      status: 'paused',
      trigger,
      attempt: 0,
      maxAttempts: 3,
      summary: 'Job is paused — resume it, then Run now',
      logs: [`${new Date().toISOString()} paused`],
      createdAt: new Date().toISOString(),
    }
    runs.set(skipped.id, skipped)
    void persistAutomationRun(skipped)
    return skipped
  }

  // Manual / retry runs get unique keys so "Run now" always executes.
  // Schedule keeps a stable day bucket for idempotency.
  const idempotencyKey =
    opts.idempotencyKey ||
    (trigger === 'schedule'
      ? buildIdempotencyKey(jobName, `schedule|${dayBucket()}`)
      : buildIdempotencyKey(jobName, `${trigger}|${Date.now()}|${randomUUID()}`))

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
    id: `run_${createHash('sha256')
      .update(idempotencyKey + randomUUID())
      .digest('hex')
      .slice(0, 16)}`,
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

  if (run.status === 'succeeded' || run.status === 'skipped' || run.status === 'paused') return run

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
      run.summary = `Retrying after error: ${message}`
      appendLog(run, `retryable_error:${message}`)
      state.lastRunId = run.id
      state.lastStatus = run.status
      state.lastFinishedAt = run.finishedAt || undefined
      await persistAutomationRun(run)
      void persistAutomationJobState(state)
      return processRun(run.id)
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
  void persistAutomationJobState(state)
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
