import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { isMongoConfigured, connectMongo } from '@/lib/db'
import { Order } from '@/models/Order'

export const dynamic = 'force-dynamic'

export default async function OrdersPage() {
  let orders: Array<{
    id: string
    shopifyOrderId: string
    status: string
    totalCents: number
    currency: string
    orderedAt: string
  }> = []

  if (isMongoConfigured()) {
    await connectMongo()
    const docs = await Order.find({}).sort({ orderedAt: -1 }).limit(50).lean()
    orders = docs.map((o) => ({
      id: String(o._id),
      shopifyOrderId: o.shopifyOrderId,
      status: o.status,
      totalCents: o.totalCents || 0,
      currency: o.currency || 'USD',
      orderedAt: o.orderedAt ? new Date(o.orderedAt).toISOString() : '',
    }))
  }

  return (
    <DashboardShell
      activePath="/dashboard/orders"
      title="Orders"
      subtitle="Mirrored from verified Shopify webhooks (HMAC required). Fulfillment stays with Printify/Shopify."
    >
      {!orders.length ? (
        <p className="text-sm text-muted">
          No orders mirrored yet. Set <code className="text-text">SHOPIFY_WEBHOOK_SECRET</code> and
          point Shopify order webhooks to <code className="text-text">/api/webhooks/shopify</code>.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-ink-2 text-xs uppercase tracking-[0.12em] text-muted">
              <tr>
                <th className="px-4 py-3">Shopify order</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Ordered</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-line">
                  <td className="px-4 py-3 text-text">{o.shopifyOrderId}</td>
                  <td className="px-4 py-3 text-text">{o.status}</td>
                  <td className="px-4 py-3 text-text">
                    {(o.totalCents / 100).toFixed(2)} {o.currency}
                  </td>
                  <td className="px-4 py-3 text-muted">{o.orderedAt.slice(0, 16).replace('T', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  )
}
