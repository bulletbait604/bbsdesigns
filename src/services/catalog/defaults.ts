import { isMongoConfigured, connectMongo } from '@/lib/db'
import { Store } from '@/models/Store'
import { Brand } from '@/models/Brand'
import { getEnv } from '@/lib/env'
import { logger } from '@/lib/logger'
import { NICHE_ENUM } from '@/lib/niches'

export type DefaultCatalogContext = {
  storeId: string
  brandId: string
  storeName: string
  brandName: string
}

/**
 * Ensure a default Store + Brand exist for the pipeline when Mongo is configured.
 * Uses Shopify domain from env when present; otherwise a stable local domain.
 */
export async function ensureDefaultCatalog(): Promise<DefaultCatalogContext | null> {
  if (!isMongoConfigured()) return null
  await connectMongo()

  const env = getEnv()
  const domain = (env.SHOPIFY_STORE_DOMAIN || 'bbsdesigns.local').toLowerCase().trim()

  let store = await Store.findOne({ shopifyDomain: domain }).exec()
  if (!store) {
    store = await Store.create({
      name: 'BBS Designs',
      shopifyDomain: domain,
      status: 'active',
    })
    logger.info('default_store_created', { id: String(store._id), domain })
  }

  const storeId = String(store._id)
  let brand = await Brand.findOne({ storeId, slug: 'bbs-main' }).exec()
  if (!brand) {
    brand = await Brand.create({
      storeId,
      name: 'BBS Main',
      slug: 'bbs-main',
      niches: [...NICHE_ENUM],
      status: 'active',
      voice: 'funny, sarcastic, cheeky, viral flashy merch',
    })
    logger.info('default_brand_created', { id: String(brand._id) })
  } else if (
    !Array.isArray(brand.niches) ||
    brand.niches.length < NICHE_ENUM.length
  ) {
    brand.niches = [...NICHE_ENUM]
    brand.voice = brand.voice || 'funny, sarcastic, cheeky, viral flashy merch'
    await brand.save()
    logger.info('default_brand_niches_expanded', { id: String(brand._id) })
  }

  return {
    storeId,
    brandId: String(brand._id),
    storeName: store.name,
    brandName: brand.name,
  }
}
