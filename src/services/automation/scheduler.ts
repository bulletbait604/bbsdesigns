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
          run.summary = 'Publishing handler ready (manual approval path)'
          run.stats = { autoPublish: env.AUTO_PUBLISH }
          break
        }
        default: {
          run.summary = `${def.label} completed (stub pipeline step)`
          run.stats = { stub: true }
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

  return processRun(run.id)
}

export async function processRun(runId: string): Promise<AutomationRunRecord> {
  const run = runs.get(runId)
  if (!run) throw new Error(`Run not found: ${runId}`)

  if (run.status === 'succeeded' || run.status === 'skipped') return run

  const state = ensureJobState(run.jobName)
  run.status = 'running'
  run.attempt += 1
  run.startedAt = new Date().toISOString()
  run.error = null
  appendLog(run, `start attempt=${run.attempt}`)

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

  return run
}

export async function retryRun(runId: string): Promise<AutomationRunRecord> {
  const prior = runs.get(runId)
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
