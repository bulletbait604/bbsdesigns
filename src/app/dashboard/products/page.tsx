import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { isMongoConfigured, connectMongo } from '@/lib/db'
import { Product } from '@/models/Product'

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  let products: Array<{
    id: string
    title: string
    niche: string
    status: string
    shopifyProductId: string | null
    printifyProductId: string | null
    tags: string[]
    updatedAt: string
  }> = []

  if (isMongoConfigured()) {
    await connectMongo()
    const docs = await Product.find({}).sort({ updatedAt: -1 }).limit(50).lean()
    products = docs.map((p) => ({
      id: String(p._id),
      title: p.title,
      niche: p.niche,
      status: p.status,
      shopifyProductId: p.shopifyProductId || null,
      printifyProductId: p.printifyProductId || null,
      tags: p.tags || [],
      updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : '',
    }))
  }

  return (
    <DashboardShell
      activePath="/dashboard/products"
      title="Products"
      subtitle="Shopify draft products created after human approval. AUTO_PUBLISH stays off."
    >
      {!products.length ? (
        <p className="text-sm text-muted">
          No products yet. Approve an idea in Safety Queue, then click{' '}
          <strong className="text-text">Create Shopify draft</strong>.
        </p>
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <article key={p.id} className="rounded-md border border-line bg-panel/80 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-accent-2">{p.niche}</p>
                  <h2 className="font-display mt-1 text-lg font-bold text-text">{p.title}</h2>
                  <p className="mt-1 text-xs text-muted">
                    {p.status}
                    {p.updatedAt ? ` · ${p.updatedAt.slice(0, 10)}` : ''}
                  </p>
                </div>
                <span className="rounded bg-ok/15 px-2 py-1 text-xs text-ok">{p.status}</span>
              </div>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted">Shopify</dt>
                  <dd className="mt-0.5 break-all text-text">{p.shopifyProductId || '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted">Printify</dt>
                  <dd className="mt-0.5 break-all text-text">{p.printifyProductId || '—'}</dd>
                </div>
              </dl>
              {p.tags.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.tags.slice(0, 8).map((tag) => (
                    <span
                      key={tag}
                      className="rounded border border-line px-2 py-0.5 text-xs text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </DashboardShell>
  )
}
