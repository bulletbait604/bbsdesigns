import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="scoreboard-grid relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(200,245,66,0.16),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(94,234,212,0.12),transparent_35%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <p className="animate-rise text-sm uppercase tracking-[0.28em] text-accent">bbsdesigns</p>
        <h1 className="font-display animate-rise mt-4 max-w-3xl text-5xl font-extrabold tracking-tight text-text sm:text-7xl">
          AI Merch Factory
        </h1>
        <p className="animate-rise-delay mt-5 max-w-xl text-base leading-7 text-muted">
          Original funny gaming, baseball, and softball merch — trend to Shopify draft with a hard
          human-approval gate.
        </p>
        <div className="animate-rise-delay mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-md bg-accent px-5 py-3 text-sm font-semibold text-ink transition hover:brightness-110"
          >
            Admin login
          </Link>
          <Link
            href="/login?next=/dashboard/providers"
            className="rounded-md border border-line px-5 py-3 text-sm text-text transition hover:border-accent/50"
          >
            Connect Shopify & Printify
          </Link>
        </div>
        <ul className="animate-rise-delay mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <li>HUMAN_APPROVAL on</li>
          <li>AUTO_PUBLISH off</li>
          <li>Drafts only until safety path is proven</li>
        </ul>
      </div>
    </main>
  )
}
