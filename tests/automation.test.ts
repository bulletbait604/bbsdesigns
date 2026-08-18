import { afterEach, describe, expect, it } from 'vitest'
import { resetEnvCache } from '@/lib/env'
import {
  clearAutomationMemory,
  enqueueJob,
  listJobStates,
  pauseJob,
  resumeJob,
  retryRun,
  runScheduledBucket,
} from '@/services/automation'

describe('automation scheduler', () => {
  afterEach(() => {
    clearAutomationMemory()
    resetEnvCache()
    delete process.env.HUMAN_APPROVAL
    delete process.env.AUTO_PUBLISH
  })

  it('runs jobs with unique ids and logs', async () => {
    const run = await enqueueJob({
      jobName: 'trend_ingestion',
      trigger: 'manual',
      idempotencyKey: 'test-trend-1',
    })
    expect(run.id).toMatch(/^run_/)
    expect(run.status).toBe('succeeded')
    expect(run.logs.length).toBeGreaterThan(0)
    expect(run.idempotencyKey).toBe('test-trend-1')
  })

  it('is idempotent for the same key', async () => {
    const a = await enqueueJob({
      jobName: 'trend_scoring',
      idempotencyKey: 'same-key',
    })
    const b = await enqueueJob({
      jobName: 'trend_scoring',
      idempotencyKey: 'same-key',
    })
    expect(a.id).toBe(b.id)
  })

  it('skips publishing when HUMAN_APPROVAL and AUTO_PUBLISH=false', async () => {
    process.env.HUMAN_APPROVAL = 'true'
    process.env.AUTO_PUBLISH = 'false'
    resetEnvCache()

    const run = await enqueueJob({
      jobName: 'publishing',
      idempotencyKey: 'pub-skip',
      force: true,
    })
    expect(run.status).toBe('skipped')
    expect(run.summary).toMatch(/HUMAN_APPROVAL/)
  })

  it('supports pause resume and retry', async () => {
    pauseJob('idea_generation')
    const paused = await enqueueJob({
      jobName: 'idea_generation',
      idempotencyKey: 'paused-1',
    })
    expect(paused.status).toBe('paused')

    resumeJob('idea_generation')
    const states = listJobStates()
    expect(states.find((s) => s.name === 'idea_generation')?.paused).toBe(false)

    const run = await enqueueJob({
      jobName: 'weekly_report',
      idempotencyKey: 'weekly-1',
      force: true,
    })
    const retried = await retryRun(run.id)
    expect(retried.trigger).toBe('retry')
    expect(retried.status).toBe('succeeded')
  })

  it('retirement job never deletes products', async () => {
    const run = await enqueueJob({
      jobName: 'retirement_candidates',
      idempotencyKey: 'retire-1',
      force: true,
    })
    expect(run.status).toBe('succeeded')
    expect(run.logs.some((l) => l.includes('no_auto_delete'))).toBe(true)
  })

  it('scheduled bucket enqueues all jobs once per day key', async () => {
    const first = await runScheduledBucket(new Date('2026-08-18T12:00:00Z'))
    const second = await runScheduledBucket(new Date('2026-08-18T18:00:00Z'))
    expect(first.length).toBe(12)
    expect(second.every((r, i) => r.id === first[i].id)).toBe(true)
  })
})
