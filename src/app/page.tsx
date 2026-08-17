export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6 py-16">
      <p className="text-sm uppercase tracking-[0.2em] text-sky-300/80">bbsdesigns</p>
      <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
        AI Merch Factory
      </h1>
      <p className="max-w-2xl text-base leading-7 text-slate-300">
        Foundation is online. Trend → slogan → safety → design → Shopify draft pipeline comes next.
        Publishing stays in human-approval mode until the full safety path is tested.
      </p>
      <ul className="space-y-2 text-sm text-slate-400">
        <li>HUMAN_APPROVAL = true</li>
        <li>AUTO_PUBLISH = false</li>
        <li>Niches: gaming · baseball · softball humor</li>
      </ul>
    </main>
  )
}
