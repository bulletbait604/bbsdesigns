import Link from 'next/link'
import { DASHBOARD_NAV } from '@/lib/dashboardData'

export function DashboardShell({
  title,
  subtitle,
  children,
  activePath,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  activePath: string
}) {
  return (
    <div className="scoreboard-grid min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row md:px-6">
        <aside className="animate-rise w-full shrink-0 md:w-56">
          <Link href="/" className="font-display block text-2xl font-extrabold tracking-tight text-accent">
            bbsdesigns
          </Link>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted">Merch Factory Ops</p>
          <nav className="mt-8 flex flex-row gap-2 overflow-x-auto pb-2 md:flex-col md:overflow-visible md:pb-0">
            {DASHBOARD_NAV.map((item) => {
              const active = activePath === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-md px-3 py-2 text-sm transition ${
                    active
                      ? 'bg-accent text-ink font-medium'
                      : 'text-muted hover:bg-panel hover:text-text'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <div className="mt-8 hidden rounded-md border border-line bg-panel/70 p-3 text-xs text-muted md:block">
            <p className="flex items-center gap-2 text-accent">
              <span className="live-dot inline-block h-2 w-2 rounded-full bg-accent" />
              HUMAN_APPROVAL
            </p>
            <p className="mt-2">AUTO_PUBLISH stays off until the full safety path is proven.</p>
          </div>
        </aside>

        <main className="animate-rise-delay min-w-0 flex-1 pb-10">
          <header className="mb-8 border-b border-line pb-5">
            <p className="text-xs uppercase tracking-[0.2em] text-accent-2">Operator console</p>
            <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-text md:text-4xl">
              {title}
            </h1>
            {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{subtitle}</p> : null}
          </header>
          {children}
        </main>
      </div>
    </div>
  )
}
