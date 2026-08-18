import { Types } from 'mongoose'
import { getEnv } from '@/lib/env'
import { isMongoConfigured, connectMongo } from '@/lib/db'
import { Product } from '@/models/Product'
import { Order } from '@/models/Order'
import { SalesMetric } from '@/models/SalesMetric'
import { logger } from '@/lib/logger'
import {
  clearAnalyticsMemory,
  upsertProductMetrics,
  buildWeeklyReport,
  seedDemoAnalytics,
} from '@/services/analytics'
import { persistWeeklyReport } from '@/services/analytics/persist'
import type { WeeklyAnalyticsReport } from '@/services/analytics/types'
import { ensureDefaultCatalog } from '@/services/catalog/defaults'

function startOfUtcWeek(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = x.getUTCDay() || 7
  if (day !== 1) x.setUTCDate(x.getUTCDate() - (day - 1))
  x.setUTCHours(0, 0, 0, 0)
  return x
}

function isObjectIdString(value: string): boolean {
  return Types.ObjectId.isValid(value) && String(new Types.ObjectId(value)) === value
}

type ShopifyOrderNode = {
  id: string
  createdAt: string
  totalPriceSet?: { shopMoney?: { amount?: string; currencyCode?: string } }
  lineItems?: {
    nodes?: Array<{
      title?: string
      quantity?: number
      product?: { id?: string; title?: string } | null
    }>
  }
}

async function fetchShopifyOrders(limit = 50): Promise<ShopifyOrderNode[]> {
  const env = getEnv()
  if (!env.SHOPIFY_STORE_DOMAIN || !env.SHOPIFY_ADMIN_ACCESS_TOKEN) return []

  const host = env.SHOPIFY_STORE_DOMAIN.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const url = `https://${host}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`
  const query = `#graphql
    query RecentOrders($first: Int!) {
      orders(first: $first, sortKey: CREATED_AT, reverse: true) {
        nodes {
          id
          createdAt
          totalPriceSet { shopMoney { amount currencyCode } }
          lineItems(first: 20) {
            nodes {
              title
              quantity
              product { id title }
            }
          }
        }
      }
    }
  `

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': env.SHOPIFY_ADMIN_ACCESS_TOKEN,
    },
    body: JSON.stringify({ query, variables: { first: limit } }),
  })
  if (!response.ok) {
    logger.warn('shopify_orders_fetch_failed', { status: response.status })
    return []
  }
  const json = (await response.json()) as {
    data?: { orders?: { nodes?: ShopifyOrderNode[] } }
    errors?: Array<{ message: string }>
  }
  if (json.errors?.length) {
    logger.warn('shopify_orders_graphql_errors', { errors: json.errors.map((e) => e.message) })
    return []
  }
  return json.data?.orders?.nodes || []
}

type Agg = {
  title: string
  niche: 'gaming' | 'baseball' | 'softball' | 'unknown'
  orders: number
  revenueCents: number
  units: number
  storeId?: string
  brandId?: string
  productId?: string
}

/**
 * Sync product/order metrics into the analytics engine + SalesMetric.
 * Prefers Mongo Product/Order mirrors; optionally enriches from Shopify GraphQL.
 */
export async function syncAnalyticsMetrics(anchor = new Date()): Promise<{
  products: number
  orders: number
  shopifyOrders: number
  report: WeeklyAnalyticsReport
  source: 'live' | 'demo'
}> {
  const weekStart = startOfUtcWeek(anchor)
  const weekEnd = new Date(weekStart)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7)

  if (!isMongoConfigured()) {
    const report = seedDemoAnalytics(anchor)
    return {
      products: report.products.length,
      orders: report.totals.orders,
      shopifyOrders: 0,
      report,
      source: 'demo',
    }
  }

  await connectMongo()
  const catalog = await ensureDefaultCatalog()
  const products = await Product.find({}).limit(100).lean()
  const orders = await Order.find({
    orderedAt: { $gte: weekStart, $lt: weekEnd },
  })
    .limit(200)
    .lean()

  const shopifyOrders = await fetchShopifyOrders(50)
  const shopifyInWeek = shopifyOrders.filter((o) => {
    const t = new Date(o.createdAt).getTime()
    return t >= weekStart.getTime() && t < weekEnd.getTime()
  })

  clearAnalyticsMemory()
  const byKey = new Map<string, Agg>()

  for (const p of products) {
    byKey.set(String(p._id), {
      title: p.title,
      niche: p.niche as Agg['niche'],
      orders: 0,
      revenueCents: 0,
      units: 0,
      storeId: String(p.storeId),
      brandId: p.brandId ? String(p.brandId) : undefined,
      productId: String(p._id),
    })
  }

  for (const order of orders) {
    const key = order.productId ? String(order.productId) : `order:${order.shopifyOrderId}`
    const existing = byKey.get(key) || {
      title: `Order ${order.shopifyOrderId}`,
      niche: 'unknown',
      orders: 0,
      revenueCents: 0,
      units: 0,
      storeId: order.storeId ? String(order.storeId) : catalog?.storeId,
      productId: order.productId ? String(order.productId) : undefined,
    }
    existing.orders += 1
    existing.revenueCents += order.totalCents || 0
    existing.units += 1
    byKey.set(key, existing)
  }

  for (const order of shopifyInWeek) {
    const lines = order.lineItems?.nodes || []
    const amount = Math.round(Number(order.totalPriceSet?.shopMoney?.amount || 0) * 100)
    if (!lines.length) {
      const key = `shopify-order:${order.id}`
      const existing = byKey.get(key) || {
        title: `Shopify ${order.id}`,
        niche: 'unknown',
        orders: 0,
        revenueCents: 0,
        units: 0,
        storeId: catalog?.storeId,
      }
      existing.orders += 1
      existing.revenueCents += amount
      existing.units += 1
      byKey.set(key, existing)
      continue
    }
    for (const line of lines) {
      const productGid = line.product?.id || `line:${line.title}`
      const existing = byKey.get(productGid) || {
        title: line.product?.title || line.title || productGid,
        niche: 'unknown',
        orders: 0,
        revenueCents: 0,
        units: 0,
        storeId: catalog?.storeId,
      }
      existing.orders += 1
      existing.units += line.quantity || 1
      existing.revenueCents += amount
      byKey.set(productGid, existing)
    }
  }

  if (!byKey.size) {
    const report = buildWeeklyReport(anchor)
    return {
      products: 0,
      orders: orders.length,
      shopifyOrders: shopifyInWeek.length,
      report,
      source: 'live',
    }
  }

  for (const [productKey, agg] of byKey) {
    upsertProductMetrics({
      productKey,
      title: agg.title,
      niche: agg.niche,
      periodStart: weekStart.toISOString(),
      periodEnd: weekEnd.toISOString(),
      // Estimated engagement proxies until Shopify Analytics is wired
      views: Math.max(agg.orders * 12, agg.orders > 0 ? 12 : 3),
      sessions: Math.max(agg.orders * 8, agg.orders > 0 ? 8 : 2),
      addToCart: Math.max(agg.orders * 2, 0),
      checkout: agg.orders,
      orders: agg.orders,
      revenueCents: agg.revenueCents,
      estimatedProfitCents: Math.round(agg.revenueCents * 0.35),
      refundsCents: 0,
      refundUnits: 0,
      trafficBySource: { direct: agg.orders || 1, referral: 1 },
    })

    const productId = agg.productId && isObjectIdString(agg.productId) ? agg.productId : null
    const storeId = agg.storeId || catalog?.storeId
    if (!storeId || !productId || !catalog) continue

    await SalesMetric.findOneAndUpdate(
      {
        storeId,
        productId,
        period: 'week',
        periodStart: weekStart,
      },
      {
        storeId,
        brandId: agg.brandId || catalog.brandId,
        productId,
        period: 'week',
        periodStart: weekStart,
        unitsSold: agg.units,
        revenueCents: agg.revenueCents,
        refundCents: 0,
        views: Math.max(agg.orders * 12, 3),
        sessions: Math.max(agg.orders * 8, 2),
        addToCart: Math.max(agg.orders * 2, 0),
        checkout: agg.orders,
        orders: agg.orders,
        estimatedProfitCents: Math.round(agg.revenueCents * 0.35),
        refundUnits: 0,
        trafficBySource: { direct: agg.orders || 1 },
        productKey,
        title: agg.title,
        status: 'active',
      },
      { upsert: true, new: true }
    )
  }

  const report = buildWeeklyReport(anchor)
  await persistWeeklyReport(report)
  logger.info('analytics_sync_complete', {
    products: byKey.size,
    mongoOrders: orders.length,
    shopifyOrders: shopifyInWeek.length,
  })

  return {
    products: byKey.size,
    orders: orders.length,
    shopifyOrders: shopifyInWeek.length,
    report,
    source: 'live',
  }
}
