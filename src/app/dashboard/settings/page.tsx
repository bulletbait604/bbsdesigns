import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { buildLaunchReport } from '@/services/security'

function badge(status: 'PASS' | 'FAIL' | 'WARNING'): string {
  if (status === 'PASS') return 'bg-ok/15 text-ok'
  if (status === 'FAIL') return 'bg-danger/20 text-danger'
  return 'bg-warn/20 text-warn'
}

export default function SettingsLaunchPage() {
  const report = buildLaunchReport()

  return (
    <DashboardShell
      activePath="/dashboard/settings"
      title="Settings & launch"
      subtitle="Controlled launch checklist. The app is not production-ready while any FAIL remains."
    >
      <div className="rounded-md border border-line bg-panel/80 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Launch report</p>
            <p className="font-display mt-2 text-3xl font-bold text-text">
              {report.productionReady ? 'READY (controlled)' : 'NOT PRODUCTION-READY'}
            </p>
            <p className="mt-1 text-sm text-muted">
              {report.summary.pass} PASS · {report.summary.warning} WARNING · {report.summary.fail}{' '}
              FAIL · generated {report.generatedAt}
            </p>
          </div>
          <span
            className={`rounded px-3 py-1 text-sm font-medium ${
              report.productionReady ? 'bg-ok/15 text-ok' : 'bg-danger/20 text-danger'
            }`}
          >
            AUTO_PUBLISH stays false
          </span>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="font-display text-xl font-bold">Checklist</h2>
        <ul className="mt-4 space-y-3">
          {report.items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-line bg-panel/60 px-4 py-3"
            >
              <div>
                <p className="font-medium text-text">{item.label}</p>
                <p className="mt-1 text-sm text-muted">{item.detail}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${badge(item.status)}`}>
                {item.status}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl font-bold">Security pass</h2>
        <ul className="mt-4 space-y-2">
          {report.security.map((check) => (
            <li
              key={check.id}
              className="grid gap-2 rounded-md border border-line/80 px-4 py-3 text-sm sm:grid-cols-[9rem_1fr_auto]"
            >
              <span className="text-muted">{check.area}</span>
              <span className="text-text">{check.detail}</span>
              <span className={`justify-self-start rounded px-2 py-0.5 text-xs font-medium sm:justify-self-end ${badge(check.status)}`}>
                {check.status}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </DashboardShell>
  )
}
