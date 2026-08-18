import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { isMongoConfigured, connectMongo } from '@/lib/db'
import { Brand } from '@/models/Brand'
import { Store } from '@/models/Store'
import { ensureDefaultCatalog } from '@/services/catalog/defaults'

export const dynamic = 'force-dynamic'

export default async function BrandsPage() {
  let brands: Array<{
    id: string
    name: string
    slug: string
    niches: string[]
    status: string
    voice: string
    storeName: string
    updatedAt: string
  }> = []

  if (isMongoConfigured()) {
    await ensureDefaultCatalog()
    await connectMongo()
    const docs = await Brand.find({}).sort({ updatedAt: -1 }).limit(40).lean()
    const stores = await Store.find({}).limit(50).lean()
    const storeNameById = new Map(stores.map((s) => [String(s._id), s.name]))

    brands = docs.map((b) => ({
      id: String(b._id),
      name: b.name,
      slug: b.slug,
      niches: (b.niches as string[]) || [],
      status: b.status,
      voice: b.voice || '',
      storeName: storeNameById.get(String(b.storeId)) || 'Store',
      updatedAt: b.updatedAt ? new Date(b.updatedAt).toISOString() : '',
    }))
  }

  return (
    <DashboardShell
      activePath="/dashboard/brands"
      title="Brands"
      subtitle="Brand voice and niche focus under each store."
    >
      {!isMongoConfigured() ? (
        <p className="text-sm text-muted">Connect MongoDB to load brand records.</p>
      ) : !brands.length ? (
        <p className="text-sm text-muted">No brands yet. Default catalog creates one on first pipeline run.</p>
      ) : (
        <div className="space-y-3">
          {brands.map((brand) => (
            <article key={brand.id} className="rounded-md border border-line bg-panel/80 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-accent-2">{brand.storeName}</p>
                  <h2 className="font-display mt-1 text-lg font-bold text-text">{brand.name}</h2>
                  <p className="mt-1 text-xs text-muted">/{brand.slug}</p>
                </div>
                <span className="rounded bg-ok/15 px-2 py-1 text-xs text-ok">{brand.status}</span>
              </div>
              <p className="mt-3 text-sm text-muted">{brand.voice || 'No voice set'}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {brand.niches.map((niche) => (
                  <span
                    key={niche}
                    className="rounded border border-line px-2 py-0.5 text-xs text-muted"
                  >
                    {niche}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </DashboardShell>
  )
}
