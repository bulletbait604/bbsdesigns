import { afterEach, describe, expect, it } from 'vitest'
import { getFeatureFlags } from '@/lib/featureFlags'
import { resetEnvCache } from '@/lib/env'

describe('feature flags', () => {
  afterEach(() => {
    delete process.env.HUMAN_APPROVAL
    delete process.env.AUTO_PUBLISH
    delete process.env.USE_RESEARCH_V2
    delete process.env.USE_DESIGN_V2
    delete process.env.USE_PRODUCT_INTELLIGENCE_V2
    delete process.env.MAX_PRODUCTS_PER_DAY
    resetEnvCache()
  })

  it('keeps auto-publish off when human approval is required', () => {
    process.env.HUMAN_APPROVAL = 'true'
    process.env.AUTO_PUBLISH = 'true'
    resetEnvCache()
    const flags = getFeatureFlags()
    expect(flags.humanApproval).toBe(true)
    expect(flags.autoPublish).toBe(false)
  })

  it('allows auto-publish only when human approval is off', () => {
    process.env.HUMAN_APPROVAL = 'false'
    process.env.AUTO_PUBLISH = 'true'
    resetEnvCache()
    const flags = getFeatureFlags()
    expect(flags.humanApproval).toBe(false)
    expect(flags.autoPublish).toBe(true)
  })

  it('defaults V2 engines on with quality caps', () => {
    resetEnvCache()
    const flags = getFeatureFlags()
    expect(flags.useResearchV2).toBe(true)
    expect(flags.useDesignV2).toBe(true)
    expect(flags.maxProductsPerDay).toBe(10)
    expect(flags.minDesignOverallScore).toBe(85)
  })

  it('allows disabling V2 via env', () => {
    process.env.USE_RESEARCH_V2 = 'false'
    process.env.USE_DESIGN_V2 = '0'
    resetEnvCache()
    const flags = getFeatureFlags()
    expect(flags.useResearchV2).toBe(false)
    expect(flags.useDesignV2).toBe(false)
  })
})