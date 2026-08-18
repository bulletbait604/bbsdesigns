'use client'

import { useEffect, useState, useTransition } from 'react'
import { DashboardShell } from '@/components/dashboard/DashboardShell'

type QueueRow = {
  id: string
  idempotencyKey: string
  status: string
  title: string
  validationErrors: string[]
  attempts: number
  lastError?: string | null
  createdAt: string
  tags: string[]
}

export function PublishingQueueClient() {
  const [items, setItems] = useState<QueueRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function refresh() {
    startTransition(async () => {
      setError(null)
      const res = await fetch('/api/publishing')
      const data = (await res.json()) as { ok?: boolean; items?: QueueRow[]; error?: string }
      if (!res.ok || !data.ok) {
        setError(data.error || 'Failed to load queue')
        return
      }
      setItems(data.items || [])
    })
  }

  useEffect(() => {
    refresh()
  }, [])

  function createDraft(idempotencyKey: string) {
    startTransition(async () => {
      setError(null)
      const res = await fetch('/api/publishing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_draft', idempotencyKey }),
      })
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string }
      if (!res.ok || !data.ok) {
        setError(data.message || data.error || 'Draft failed')
        return
      }
      refresh()
    })
  }

  return (
    <DashboardShell
      activePath="/dashboard/publishing"
      title="Publishing Queue"
      subtitle="Shopify DRAFT only. AUTO_PUBLISH stays false — Printify sync when configured."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={refresh}
          className="rounded-md border border-line px-3 py-2 text-sm text-text disabled:opacity-50"
        >
          Refresh
        </button>
      </div>
      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}
      {!items.length ? (
        <p className="text-sm text-muted">
          Queue empty. Run listing preparation in Automation, or create a draft from Safety Queue after
          Approve.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-md border border-line bg-panel/80 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-display text-lg font-bold text-text">{item.title}</h2>
                  <p className="mt-1 text-xs text-muted">
                    {item.status} · attempts {item.attempts} · {item.idempotencyKey}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={pending || item.status === 'PUBLISHED' || item.status === 'REJECTED'}
                  onClick={() => createDraft(item.idempotencyKey)}
                  className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-ink disabled:opacity-40"
                >
                  Create Shopify draft
                </button>
              </div>
              {item.validationErrors.length ? (
                <p className="mt-2 text-sm text-warn">{item.validationErrors.join(', ')}</p>
              ) : null}
              {item.lastError ? <p className="mt-2 text-sm text-danger">{item.lastError}</p> : null}
              {item.tags.some((t) => t.startsWith('shopify:')) ? (
                <p className="mt-2 text-sm text-ok">
                  {item.tags.filter((t) => t.startsWith('shopify:') || t.startsWith('printify:')).join(' · ')}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </DashboardShell>
  )
}
