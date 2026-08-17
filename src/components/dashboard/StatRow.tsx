export function StatRow({
  stats,
}: {
  stats: Array<{ label: string; value: string; hint: string }>
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-md border border-line bg-panel/80 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">{stat.label}</p>
          <p className="font-display mt-2 text-3xl font-bold text-accent">{stat.value}</p>
          <p className="mt-1 text-xs text-muted">{stat.hint}</p>
        </div>
      ))}
    </div>
  )
}
