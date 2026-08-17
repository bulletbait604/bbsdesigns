import { afterEach, describe, expect, it } from 'vitest'
import { getFeatureFlags } from '@/lib/featureFlags'
import { resetEnvCache } from '@/lib/env'

describe('feature flags', () => {
  afterEach(() => {
    delete process.env.HUMAN_APPROVAL
    delete process.env.AUTO_PUBLISH
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
})
