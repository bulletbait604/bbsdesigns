import { afterEach, describe, expect, it } from 'vitest'
import { getEnv, resetEnvCache } from '@/lib/env'

describe('env', () => {
  afterEach(() => {
    resetEnvCache()
  })

  it('loads defaults for local foundation boot', () => {
    resetEnvCache()
    const env = getEnv()
    expect(env.APP_URL).toBeTruthy()
    expect(env.HUMAN_APPROVAL).toBe(true)
    expect(env.AUTO_PUBLISH).toBe(false)
    expect(env.MIN_SAFETY_SCORE).toBeGreaterThanOrEqual(90)
  })
})
