import { getEnv, missingOptionalIntegrations } from '@/lib/env'
import { isMongoConfigured } from '@/lib/db'
import { CONNECTION_STEPS } from '@/lib/dashboardData'
import { DashboardShell } from '@/components/dashboard/DashboardShell'

export const dynamic = 'force-dynamic'

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`rounded px-2 py-1 text-xs font-medium ${
        ok ? 'bg-ok/15 text-ok' : 'bg-warn/15 text-warn'
      }`}
    >
      {label}
    </span>
  )
}

export default function ProvidersPage() {
  const env = getEnv()
  const missing = missingOptionalIntegrations(env)
  const shopifyOk = Boolean(env.SHOPIFY_STORE_DOMAIN && env.SHOPIFY_ADMIN_ACCESS_TOKEN)
  const printifyOk = Boolean(env.PRINTIFY_API_TOKEN)
  const mongoOk = isMongoConfigured()
  const aiOk = Boolean(env.AI_TEXT_API_KEY)
  const imageOk = Boolean(env.IMAGE_API_KEY)

  return (
    <DashboardShell
      activePath="/dashboard/providers"
      title="Providers"
      subtitle="Connect accounts via environment variables. Secrets never live in git — use Vercel env + .env.local."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-md border border-line bg-panel/80 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Shopify</h2>
            <StatusBadge ok={shopifyOk} label={shopifyOk ? 'Configured' : 'Needs keys'} />
          </div>
          <p className="mt-2 text-xs text-muted">
            Domain: {env.SHOPIFY_STORE_DOMAIN || 'not set'} · API {env.SHOPIFY_API_VERSION}
          </p>
        </div>
        <div className="rounded-md border border-line bg-panel/80 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Printify</h2>
            <StatusBadge ok={printifyOk} label={printifyOk ? 'Configured' : 'Needs token'} />
          </div>
          <p className="mt-2 text-xs text-muted">POD fulfillment provider token</p>
        </div>
        <div className="rounded-md border border-line bg-panel/80 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">MongoDB</h2>
            <StatusBadge ok={mongoOk} label={mongoOk ? 'Configured' : 'Needs URI'} />
          </div>
          <p className="mt-2 text-xs text-muted">Required before live pipeline persistence</p>
        </div>
        <div className="rounded-md border border-line bg-panel/80 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">AI text</h2>
            <StatusBadge ok={aiOk} label={aiOk ? 'Configured' : 'Optional now'} />
          </div>
        </div>
        <div className="rounded-md border border-line bg-panel/80 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Image gen</h2>
            <StatusBadge ok={imageOk} label={imageOk ? 'Configured' : 'Optional now'} />
          </div>
        </div>
      </div>

      {missing.length > 0 ? (
        <p className="mt-4 text-sm text-warn">Missing integrations: {missing.join(', ')}</p>
      ) : (
        <p className="mt-4 text-sm text-ok">Core optional integrations look present in this environment.</p>
      )}

      <section className="mt-8 space-y-6">
        <div className="rounded-md border border-line bg-panel/80 p-5">
          <h3 className="font-display text-xl font-bold text-accent">Connect Shopify</h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-muted">
            {CONNECTION_STEPS.shopify.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
        <div className="rounded-md border border-line bg-panel/80 p-5">
          <h3 className="font-display text-xl font-bold text-accent">Connect Printify</h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-muted">
            {CONNECTION_STEPS.printify.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
        <div className="rounded-md border border-line bg-panel/80 p-5">
          <h3 className="font-display text-xl font-bold text-accent">Connect MongoDB</h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-muted">
            {CONNECTION_STEPS.mongodb.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </section>
    </DashboardShell>
  )
}
