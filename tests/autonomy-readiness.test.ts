import { afterEach, describe, expect, it } from 'vitest'
import { resetEnvCache } from '@/lib/env'
import { clearAutomationMemory, assessAutonomyReadiness } from '@/services/automation'
import { clearProviders } from '@/providers/registry'

describe('autonomy readiness', () => {
  afterEach(() => {
    clearAutomationMemory()
    clearProviders()
    resetEnvCache()
    delete process.env.MONGODB_URI
    delete process.env.IMAGE_PROVIDER
    delete process.env.IMAGE_API_KEY
    delete process.env.AI_TEXT_API_KEY
    delete process.env.GEMINI_API
    delete process.env.GEMINI_API_KEY
    delete process.env.GOOGLE_API_KEY
    delete process.env.CRON_SECRET
  })

  it('reports not ready without mongo and gemini keys', () => {
    const r = assessAutonomyReadiness()
    expect(r.readyForAutonomousGeneration).toBe(false)
    expect(r.readyForAutonomousPublish).toBe(false)
    expect(r.textDesigns.ready).toBe(false)
    expect(r.imageDesigns.ready).toBe(false)
    expect(r.blockers.length).toBeGreaterThan(0)
  })

  it('marks text and image ready when Gemini key is present with mongo', () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/bbs-test'
    process.env.GEMINI_API = 'test-gemini-key'
    resetEnvCache()

    const r = assessAutonomyReadiness()
    expect(r.mongo).toBe(true)
    expect(r.textDesigns.ready).toBe(true)
    expect(r.imageDesigns.ready).toBe(true)
    expect(r.trendResearch).toBeTruthy()
    expect(r.readyForAutonomousGeneration).toBe(true)
    expect(r.readyForAutonomousPublish).toBe(false)
    expect(r.imageDesigns.maxAiPerRun).toBeGreaterThanOrEqual(1)
  })
})
