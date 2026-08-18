import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { isMongoConfigured, connectMongo } from '@/lib/db'
import { Store } from '@/models/Store'
import { ensureDefaultCatalog } from '@/services/catalog/defaults'

export const dynamic = 'force-dynamic'

export default async function StoresPage() {
  let stores: Array<{
    id: string
    name: string
    shopifyDomain: string
    status: string
    currency: string
    timezone: string
    updatedAt: string
  }> = []

  if (isMongoConfigured()) {
    await ensureDefaultCatalog()
    await connectMongo()
    const docs = await Store.find({}).sort({ updatedAt: -1 }).limit(20).lean()
    stores = docs.map((s) => ({
      id: String(s._id),
      name: s.name,
      shopifyDomain: s.shopifyDomain,
      status: s.status,
      currency: s.currency || 'USD',
      timezone: s.timezone || 'America/Los_Angeles',
      updatedAt: s.updatedAt ? new Date(s.updatedAt).toISOString() : '',
    }))
  }

  return (
    <DashboardShell
      activePath="/dashboard/stores"
      title="Stores"
      subtitle="Shopify store records linked to this factory."
    >
      {!isMongoConfigured() ? (
        <p className="text-sm text-muted">Connect MongoDB to load store records.</p>
      ) : !stores.length ? (
        <p className="text-sm text-muted">No stores yet. Default catalog creates one on first pipeline run.</p>
      ) : (
        <div className="space-y-3">
          {stores.map((store) => (
            <article key={store.id} className="rounded-md border border-line bg-panel/80 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-display text-lg font-bold text-text">{store.name}</h2>
                  <p className="mt-1 text-sm text-muted">{store.shopifyDomain}</p>
                </div>
                <span className="rounded bg-ok/15 px-2 py-1 text-xs text-ok">{store.status}</span>
              </div>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted">Currency</dt>
                  <dd className="mt-0.5 text-text">{store.currency}</dd>
                </div>
                <div>
                  <dt className="text-muted">Timezone</dt>
                  <dd className="mt-0.5 text-text">{store.timezone}</dd>
                </div>
                <div>
                  <dt className="text-muted">Updated</dt>
                  <dd className="mt-0.5 text-text">{store.updatedAt.slice(0, 10) || '—'}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </DashboardShell>
  )
}
