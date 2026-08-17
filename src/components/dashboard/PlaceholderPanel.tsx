import { DashboardShell } from '@/components/dashboard/DashboardShell'

export function PlaceholderPanel({
  activePath,
  title,
  subtitle,
  bullets,
}: {
  activePath: string
  title: string
  subtitle: string
  bullets: string[]
}) {
  return (
    <DashboardShell activePath={activePath} title={title} subtitle={subtitle}>
      <div className="rounded-md border border-line bg-panel/80 p-5">
        <p className="text-sm text-muted">This section is wired for the UI now. Live data hooks up as each engine lands.</p>
        <ul className="mt-4 space-y-2 text-sm text-text">
          {bullets.map((b) => (
            <li key={b} className="flex gap-2">
              <span className="text-accent">▸</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </DashboardShell>
  )
}
