import { describe, expect, it, afterEach } from 'vitest'
import { resetEnvCache } from '@/lib/env'
import { buildLaunchReport, runSecurityPass, securitySummary } from '@/services/security'

describe('security + launch', () => {
  afterEach(() => {
    resetEnvCache()
    delete process.env.HUMAN_APPROVAL
    delete process.env.AUTO_PUBLISH
    delete process.env.AUTH_SECRET
    delete process.env.ADMIN_SETUP_TOKEN
    delete process.env.MONGODB_URI
  })

  it('fails launch when AUTO_PUBLISH is true', () => {
    process.env.HUMAN_APPROVAL = 'true'
    process.env.AUTO_PUBLISH = 'true'
    process.env.AUTH_SECRET = 'x'.repeat(32)
    process.env.ADMIN_SETUP_TOKEN = 'y'.repeat(16)
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test'
    resetEnvCache()

    const report = buildLaunchReport()
    expect(report.productionReady).toBe(false)
    expect(report.items.some((i) => i.id === 'auto-publish-off' && i.status === 'FAIL')).toBe(true)
  })

  it('security summary counts statuses', () => {
    process.env.HUMAN_APPROVAL = 'true'
    process.env.AUTO_PUBLISH = 'false'
    process.env.AUTH_SECRET = 'x'.repeat(32)
    process.env.ADMIN_SETUP_TOKEN = 'y'.repeat(16)
    resetEnvCache()

    const checks = runSecurityPass()
    const summary = securitySummary(checks)
    expect(summary.fail).toBe(0)
    expect(summary.pass).toBeGreaterThan(0)
  })

  it('does not claim ready when Mongo is missing', () => {
    process.env.HUMAN_APPROVAL = 'true'
    process.env.AUTO_PUBLISH = 'false'
    process.env.AUTH_SECRET = 'x'.repeat(32)
    process.env.ADMIN_SETUP_TOKEN = 'y'.repeat(16)
    delete process.env.MONGODB_URI
    resetEnvCache()

    const report = buildLaunchReport()
    expect(report.productionReady).toBe(false)
    expect(report.items.find((i) => i.id === 'mongodb')?.status).toBe('FAIL')
  })
})
