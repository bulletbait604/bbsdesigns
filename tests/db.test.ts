import { describe, expect, it } from 'vitest'
import { connectMongo, isMongoConfigured, resetMongoCache } from '@/lib/db'
import { resetEnvCache } from '@/lib/env'

describe('db connection helpers', () => {
  it('reports mongo as unconfigured when URI is empty', () => {
    expect(isMongoConfigured('')).toBe(false)
    expect(isMongoConfigured('   ')).toBe(false)
    expect(isMongoConfigured('mongodb://localhost:27017/test')).toBe(true)
  })

  it('throws a clear error when connecting without MONGODB_URI', async () => {
    delete process.env.MONGODB_URI
    resetEnvCache()
    resetMongoCache()
    await expect(connectMongo()).rejects.toThrow(/MONGODB_URI is not configured/)
  })
})
