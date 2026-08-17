import { getEnv } from '@/lib/env'
import { DashboardShell } from '@/components/dashboard/DashboardShell'

export const dynamic = 'force-dynamic'

export default function SettingsPage() {
  const env = getEnv()

  return (
    <DashboardShell
      activePath="/dashboard/settings"
      title="Settings"
      subtitle="Runtime flags for this deployment. Change values in Vercel Environment Variables, then redeploy."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-line bg-panel/80 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">HUMAN_APPROVAL</p>
          <p className="font-display mt-2 text-2xl font-bold text-accent">
            {String(env.HUMAN_APPROVAL)}
          </p>
        </div>
        <div className="rounded-md border border-line bg-panel/80 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">AUTO_PUBLISH</p>
          <p className="font-display mt-2 text-2xl font-bold text-warn">{String(env.AUTO_PUBLISH)}</p>
        </div>
        <div className="rounded-md border border-line bg-panel/80 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">MIN_SAFETY_SCORE</p>
          <p className="font-display mt-2 text-2xl font-bold">{env.MIN_SAFETY_SCORE}</p>
        </div>
        <div className="rounded-md border border-line bg-panel/80 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">MIN_DESIGN_QUALITY_SCORE</p>
          <p className="font-display mt-2 text-2xl font-bold">{env.MIN_DESIGN_QUALITY_SCORE}</p>
        </div>
        <div className="rounded-md border border-line bg-panel/80 p-4 sm:col-span-2">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">APP_URL</p>
          <p className="mt-2 break-all text-sm text-text">{env.APP_URL}</p>
        </div>
      </div>

      <div className="mt-8 rounded-md border border-line bg-panel/80 p-5 text-sm text-muted">
        <p className="font-display text-lg font-bold text-text">Vercel env checklist</p>
        <ul className="mt-3 space-y-1">
          <li>APP_URL=https://your-deployment.vercel.app</li>
          <li>MONGODB_URI=...</li>
          <li>SHOPIFY_STORE_DOMAIN=your-store.myshopify.com</li>
          <li>SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_...</li>
          <li>PRINTIFY_API_TOKEN=...</li>
          <li>HUMAN_APPROVAL=true</li>
          <li>AUTO_PUBLISH=false</li>
        </ul>
      </div>
    </DashboardShell>
  )
}
