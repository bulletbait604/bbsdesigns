'use client'

import { useState, useTransition } from 'react'
import type { QueueItem } from '@/lib/dashboardData'
import { artworkUrl, mockupUrl } from '@/lib/demoCatalog'

function Score({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className={`font-display mt-1 text-xl font-bold ${warn ? 'text-danger' : 'text-text'}`}>
        {value}
      </p>
    </div>
  )
}

export function ApprovalCard({ item }: { item: QueueItem }) {
  const rejected = item.safetyDecision === 'REJECT'
  const [status, setStatus] = useState(item.status)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const art =
    item.artworkUrl || (item.designPreviewId ? artworkUrl(item.designPreviewId) : null)
  const mock =
    item.mockupUrl || (item.designPreviewId ? mockupUrl(item.designPreviewId) : null)

  function act(action: 'approve' | 'reject') {
    setMessage(null)
    startTransition(async () => {
      const res = await fetch('/api/safety', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId: item.id, action }),
      })
      const data = (await res.json()) as { ok?: boolean; status?: string; error?: string }
      if (!res.ok || !data.ok) {
        setMessage(data.error || 'Action failed')
        return
      }
      setStatus(data.status || action)
      setMessage(action === 'approve' ? 'Approved (publish still locked)' : 'Rejected')
    })
  }

  return (
    <article className="rounded-md border border-line bg-panel/80 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-accent-2">{item.niche}</p>
          <h2 className="font-display mt-1 text-2xl font-bold text-text">{item.title}</h2>
          <p className="mt-1 text-sm text-muted">{item.slogan}</p>
        </div>
        <span
          className={`rounded px-2 py-1 text-xs font-medium ${
            rejected ? 'bg-danger/20 text-danger' : 'bg-ok/15 text-ok'
          }`}
        >
          {item.safetyDecision}
        </span>
      </div>

      {art ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="relative aspect-square overflow-hidden rounded-md border border-line bg-ink">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={art}
              alt={`Design for ${item.title}`}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <span className="absolute left-2 top-2 rounded bg-ink/80 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-accent">
              Design
            </span>
          </div>
          <div className="relative aspect-square overflow-hidden rounded-md border border-line bg-ink">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mock || art}
              alt={`Mockup for ${item.title}`}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <span className="absolute left-2 top-2 rounded bg-ink/80 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-accent-2">
              Mockup
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-md border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          No design/mockup — safety REJECT blocked generation.
        </div>
      )}

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Trend</dt>
          <dd className="mt-1 text-text">{item.trend}</dd>
        </div>
        <div>
          <dt className="text-muted">Design / mockup · status</dt>
          <dd className="mt-1 text-text">
            {item.designLabel} · {item.mockupLabel} · {status}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted">Description</dt>
          <dd className="mt-1 text-text">{item.description}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted">Tags</dt>
          <dd className="mt-1 flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <span key={tag} className="rounded border border-line px-2 py-0.5 text-xs text-muted">
                {tag}
              </span>
            ))}
          </dd>
        </div>
      </dl>

      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 sm:grid-cols-5">
        <Score label="Trend" value={item.trendScore} />
        <Score label="Safety" value={item.safetyScore} warn={item.safetyScore < 90} />
        <Score label="IP risk" value={item.ipRisk} warn={item.ipRisk >= 40} />
        <Score label="Quality" value={item.qualityScore} />
        <Score label="Margin est." value={item.estimatedMargin} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={rejected || pending || status === 'approved'}
          onClick={() => act('approve')}
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={pending || status === 'rejected'}
          onClick={() => act('reject')}
          className="rounded-md border border-danger/40 px-3 py-2 text-sm text-danger disabled:opacity-40"
        >
          Reject
        </button>
        <button
          type="button"
          disabled
          className="rounded-md border border-line px-3 py-2 text-sm text-muted disabled:opacity-50"
          title="Edit arrives in a later pass"
        >
          Edit
        </button>
        <button
          type="button"
          disabled
          className="rounded-md border border-line px-3 py-2 text-sm text-muted disabled:opacity-50"
          title="Regenerate arrives with design API"
        >
          Regenerate
        </button>
        <button
          type="button"
          disabled
          className="rounded-md border border-line px-3 py-2 text-sm text-muted disabled:opacity-50"
          title="Publish stays locked while AUTO_PUBLISH=false"
        >
          Publish (locked)
        </button>
      </div>
      {message ? <p className="mt-3 text-sm text-muted">{message}</p> : null}
    </article>
  )
}
