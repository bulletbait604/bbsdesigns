import { describe, expect, it } from 'vitest'
import {
  AutomationRun,
  AuditLog,
  Brand,
  Design,
  Idea,
  Order,
  Product,
  ProductLifecycleDecision,
  ProductVariant,
  Provider,
  PublishingJob,
  SafetyReview,
  SalesMetric,
  Settings,
  Store,
  TrendScore,
  TrendSignal,
  WeeklyAnalyticsReport,
} from '@/models'

const requiredModels = [
  ['Store', Store],
  ['Brand', Brand],
  ['TrendSignal', TrendSignal],
  ['TrendScore', TrendScore],
  ['Idea', Idea],
  ['Design', Design],
  ['SafetyReview', SafetyReview],
  ['Product', Product],
  ['ProductVariant', ProductVariant],
  ['Provider', Provider],
  ['PublishingJob', PublishingJob],
  ['Order', Order],
  ['SalesMetric', SalesMetric],
  ['ProductLifecycleDecision', ProductLifecycleDecision],
  ['WeeklyAnalyticsReport', WeeklyAnalyticsReport],
  ['AutomationRun', AutomationRun],
  ['AuditLog', AuditLog],
  ['Settings', Settings],
] as const

describe('mongodb models', () => {
  it('registers all required collections', () => {
    for (const [name, model] of requiredModels) {
      expect(model.modelName, name).toBe(name)
    }
  })

  it('indexes status, createdAt, storeId, brandId, score, and publishing status', () => {
    const storeIndexes = Store.schema.indexes()
    expect(storeIndexes.some((idx) => 'status' in idx[0])).toBe(true)
    expect(storeIndexes.some((idx) => 'createdAt' in idx[0])).toBe(true)

    const brandIndexes = Brand.schema.indexes()
    expect(brandIndexes.some((idx) => 'storeId' in idx[0])).toBe(true)
    expect(brandIndexes.some((idx) => 'status' in idx[0])).toBe(true)

    const scoreIndexes = TrendScore.schema.indexes()
    expect(scoreIndexes.some((idx) => 'score' in idx[0])).toBe(true)

    const publishIndexes = PublishingJob.schema.indexes()
    expect(publishIndexes.some((idx) => 'status' in idx[0])).toBe(true)

    const productIndexes = Product.schema.indexes()
    expect(productIndexes.some((idx) => 'provenance.publishStatus' in idx[0])).toBe(true)

    expect(Design.schema.path('prompt')).toBeTruthy()
    expect(Design.schema.path('provider')).toBeTruthy()
    expect(Design.schema.path('promptVersion')).toBeTruthy()
    expect(Design.schema.path('width')).toBeTruthy()
    expect(SafetyReview.schema.path('policyVersion')).toBeTruthy()
    expect(SafetyReview.schema.path('modelResponse')).toBeTruthy()
  })

  it('requires provenance on generated assets', async () => {
    expect(Idea.schema.path('provenance')).toBeTruthy()
    expect(Design.schema.path('provenance')).toBeTruthy()
    expect(Product.schema.path('provenance')).toBeTruthy()

    const idea = new Idea({
      storeId: '507f1f77bcf86cd799439011',
      brandId: '507f1f77bcf86cd799439012',
      niche: 'gaming',
      slogan: 'Lag is a lifestyle',
    })
    await expect(idea.validate()).rejects.toThrow(/provenance/i)
  })
})
