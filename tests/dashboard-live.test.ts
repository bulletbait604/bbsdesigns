import { afterEach, describe, expect, it } from 'vitest'
import { resetEnvCache } from '@/lib/env'
import {
  loadDesignsForDashboard,
  loadIdeasForDashboard,
  loadSafetyQueueForDashboard,
} from '@/services/pipeline/dashboard'

describe('dashboard live loaders without mongo', () => {
  afterEach(() => {
    resetEnvCache()
  })

  it('returns demo source when Mongo is not configured', async () => {
    const prev = process.env.MONGODB_URI
    delete process.env.MONGODB_URI
    resetEnvCache()

    const ideas = await loadIdeasForDashboard()
    const designs = await loadDesignsForDashboard()
    const safety = await loadSafetyQueueForDashboard()

    expect(ideas.source).toBe('demo')
    expect(ideas.ideas.length).toBeGreaterThan(0)
    expect(designs.source).toBe('demo')
    expect(designs.designs.length).toBeGreaterThan(0)
    expect(safety.source).toBe('demo')
    expect(safety.items.length).toBeGreaterThan(0)

    if (prev !== undefined) process.env.MONGODB_URI = prev
    else delete process.env.MONGODB_URI
    resetEnvCache()
  })
})
