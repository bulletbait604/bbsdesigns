import { afterEach, describe, expect, it } from 'vitest'
import { resetEnvCache } from '@/lib/env'
import {
  loadDesignsForDashboard,
  loadIdeasForDashboard,
  loadOverviewForDashboard,
  loadSafetyQueueForDashboard,
} from '@/services/pipeline/dashboard'

describe('dashboard live loaders without mongo', () => {
  afterEach(() => {
    resetEnvCache()
  })

  it('shows empty slate when Mongo is not configured (no demo filler)', async () => {
    const prev = process.env.MONGODB_URI
    delete process.env.MONGODB_URI
    resetEnvCache()

    const ideas = await loadIdeasForDashboard()
    const designs = await loadDesignsForDashboard()
    const safety = await loadSafetyQueueForDashboard()
    const overview = await loadOverviewForDashboard()

    expect(ideas.source).toBe('demo')
    expect(ideas.ideas).toEqual([])
    expect(designs.source).toBe('demo')
    expect(designs.designs).toEqual([])
    expect(safety.source).toBe('demo')
    expect(safety.items).toEqual([])
    expect(overview.empty).toBe(true)
    expect(overview.approvals).toEqual([])
    expect(overview.trends).toEqual([])

    if (prev !== undefined) process.env.MONGODB_URI = prev
    else delete process.env.MONGODB_URI
    resetEnvCache()
  })
})
