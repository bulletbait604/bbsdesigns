import { isMongoConfigured, connectMongo } from '@/lib/db'
import { AutomationRun } from '@/models/AutomationRun'
import { logger } from '@/lib/logger'
import type { AutomationRunRecord } from '@/services/automation/types'

export async function persistAutomationRun(run: AutomationRunRecord): Promise<void> {
  if (!isMongoConfigured()) return
  try {
    await connectMongo()
    await AutomationRun.findOneAndUpdate(
      { idempotencyKey: run.idempotencyKey },
      {
        runId: run.id,
        jobName: run.jobName,
        idempotencyKey: run.idempotencyKey,
        status: run.status === 'paused' ? 'paused' : run.status,
        trigger: run.trigger === 'retry' ? 'retry' : run.trigger,
        attempt: run.attempt,
        maxAttempts: run.maxAttempts,
        summary: run.summary,
        logs: run.logs.slice(-100),
        stats: run.stats || {},
        error: run.error ?? null,
        startedAt: run.startedAt ? new Date(run.startedAt) : null,
        finishedAt: run.finishedAt ? new Date(run.finishedAt) : null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
  } catch (error) {
    logger.error('automation_persist_failed', {
      error: error instanceof Error ? error.message : String(error),
      runId: run.id,
    })
  }
}

export async function findAutomationRunByIdempotencyKey(
  key: string
): Promise<AutomationRunRecord | null> {
  if (!isMongoConfigured()) return null
  try {
    await connectMongo()
    const doc = await AutomationRun.findOne({ idempotencyKey: key }).lean()
    if (!doc) return null
    return docToRecord(doc)
  } catch {
    return null
  }
}

export async function findAutomationRunById(runId: string): Promise<AutomationRunRecord | null> {
  if (!isMongoConfigured()) return null
  try {
    await connectMongo()
    const doc = await AutomationRun.findOne({ runId }).lean()
    if (!doc) return null
    return docToRecord(doc)
  } catch {
    return null
  }
}

export async function listAutomationRunsFromMongo(limit = 50): Promise<AutomationRunRecord[]> {
  if (!isMongoConfigured()) return []
  try {
    await connectMongo()
    const docs = await AutomationRun.find({}).sort({ createdAt: -1 }).limit(limit).lean()
    return docs.map(docToRecord)
  } catch {
    return []
  }
}

function docToRecord(doc: {
  runId?: string | null
  jobName: string
  idempotencyKey: string
  status: string
  trigger: string
  attempt?: number | null
  maxAttempts?: number | null
  summary?: string | null
  logs?: string[] | null
  stats?: Record<string, unknown> | null
  error?: string | null
  createdAt?: Date
  startedAt?: Date | null
  finishedAt?: Date | null
}): AutomationRunRecord {
  return {
    id: doc.runId || `run_${doc.idempotencyKey.slice(0, 16)}`,
    jobName: doc.jobName as AutomationRunRecord['jobName'],
    idempotencyKey: doc.idempotencyKey,
    status: doc.status as AutomationRunRecord['status'],
    trigger: doc.trigger as AutomationRunRecord['trigger'],
    attempt: doc.attempt ?? 0,
    maxAttempts: doc.maxAttempts ?? 3,
    summary: doc.summary || '',
    logs: doc.logs || [],
    error: doc.error ?? null,
    createdAt: doc.createdAt?.toISOString?.() || new Date().toISOString(),
    startedAt: doc.startedAt?.toISOString?.() || null,
    finishedAt: doc.finishedAt?.toISOString?.() || null,
    stats: doc.stats || undefined,
  }
}
