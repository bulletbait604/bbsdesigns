'use client'

import { useMemo, useState, useTransition } from 'react'
import type {
  AutomationJobDefinition,
  AutomationJobState,
  AutomationRunRecord,
} from '@/services/automation/types'

function statusClass(status: string): string {
  if (status === 'succeeded') return 'text-ok'
  if (status === 'failed') return 'text-danger'
  if (status === 'skipped' || status === 'paused') return 'text-warn'
  if (status === 'running') return 'text-accent'
  return 'text-muted'
}

export function AutomationConsole({
  jobs,
  initialStates,
  initialRuns,
}: {
  jobs: AutomationJobDefinition[]
  initialStates: AutomationJobState[]
  initialRuns: AutomationRunRecord[]
}) {
  const [states, setStates] = useState(initialStates)
  const [runs, setRuns] = useState(initialRuns)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(initialRuns[0]?.id || null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [busyJob, setBusyJob] = useState<string | null>(null)

  const selectedRun = useMemo(
    () => runs.find((r) => r.id === selectedRunId) || null,
    [runs, selectedRunId]
  )

  async function call(body: Record<string, unknown>, jobName?: string) {
    setError(null)
    setNotice(null)
    if (jobName) setBusyJob(jobName)
    try {
      const res = await fetch('/api/automation', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        states?: AutomationJobState[]
        runs?: AutomationRunRecord[]
        run?: AutomationRunRecord
        purge?: Record<string, unknown>
        next?: string
      }
      if (!res.ok) {
        setError(data.error || `request_failed_${res.status}`)
        return
      }
      if (data.states) setStates(data.states)
      if (data.runs) setRuns(data.runs)
      if (body.action === 'factory_reset' || body.action === 'purge_viral_state') {
        const purged = data.purge
          ? Object.entries(data.purge)
              .filter(([k, v]) => typeof v === 'number' && k !== 'purged')
              .map(([k, v]) => `${k}:${v}`)
              .join(', ')
          : ''
        setNotice(
          `Factory reset complete${purged ? ` (${purged})` : ''}. Ideas, designs, trends, and mockups cleared. Run trend research next.`
        )
        return
      }
      if (data.run?.id) {
        setSelectedRunId(data.run.id)
        setNotice(
          `${data.run.jobName}: ${data.run.status}${data.run.summary ? ` — ${data.run.summary}` : ''}`
        )
      } else if (body.action === 'pause') {
        setNotice(`Paused ${String(body.jobName)}`)
      } else if (body.action === 'resume') {
        setNotice(`Resumed ${String(body.jobName)}`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'network_error')
    } finally {
      setBusyJob(null)
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-md border border-ok/40 bg-ok/10 px-3 py-2 text-sm text-ok">{notice}</p>
      ) : null}
      {pending ? (
        <p className="text-sm text-muted">
          Running{busyJob ? ` ${busyJob}` : ''}… this can take up to a minute for design jobs.
        </p>
      ) : null}

      <div className="rounded-md border border-danger/40 bg-danger/10 p-4">
        <h2 className="font-display text-lg font-bold text-text">Factory reset</h2>
        <p className="mt-1 text-sm text-muted">
          Deletes all ideas, designs, mockups, trends, safety reviews, products, and research
          opportunities so you can start fresh. Does not touch admin login, store, or brand settings.
        </p>
        <button
          type="button"
          disabled={pending}
          className="mt-3 rounded-md border border-danger/50 bg-danger/20 px-3 py-2 text-sm text-danger hover:bg-danger/30 disabled:opacity-40"
          onClick={() => {
            if (
              !window.confirm(
                'Erase ALL ideas, designs, mockups, and trend research? This cannot be undone.'
              )
            ) {
              return
            }
            startTransition(() => {
              void call({ action: 'factory_reset' }, 'factory_reset')
            })
          }}
        >
          {busyJob === 'factory_reset' ? 'Clearing…' : 'Erase all creative data'}
        </button>
      </div>

      <div className="overflow-x-auto rounded-md border border-line">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-ink-2 text-xs uppercase tracking-[0.12em] text-muted">
            <tr>
              <th className="px-3 py-2">Job</th>
              <th className="px-3 py-2">State</th>
              <th className="px-3 py-2">Last</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => {
              const state = states.find((s) => s.name === job.name)
              const paused = Boolean(state?.paused)
              return (
                <tr key={job.name} className="border-t border-line/80 bg-panel/50">
                  <td className="px-3 py-3">
                    <p className="font-medium text-text">{job.label}</p>
                    <p className="text-xs text-muted">{job.description}</p>
                  </td>
                  <td className="px-3 py-3 text-text">
                    {paused ? (
                      <span className="text-warn">Paused</span>
                    ) : (
                      <span className="text-ok">Active</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className={statusClass(state?.lastStatus || 'queued')}>
                      {state?.lastStatus || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={pending || paused}
                        title={paused ? 'Resume this job before running' : 'Execute this job now'}
                        className="rounded border border-line px-2 py-1 text-xs text-text hover:bg-ink disabled:opacity-40"
                        onClick={() =>
                          startTransition(() => {
                            void call({ action: 'run_now', jobName: job.name }, job.name)
                          })
                        }
                      >
                        {busyJob === job.name ? 'Running…' : 'Run now'}
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        className="rounded border border-line px-2 py-1 text-xs text-text hover:bg-ink disabled:opacity-40"
                        onClick={() =>
                          startTransition(() => {
                            void call({
                              action: paused ? 'resume' : 'pause',
                              jobName: job.name,
                            })
                          })
                        }
                      >
                        {paused ? 'Resume' : 'Pause'}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-line bg-panel/80 p-4">
          <h2 className="font-display text-lg font-bold">Recent runs</h2>
          <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
            {runs.length === 0 ? (
              <li className="text-sm text-muted">No runs yet. Use Run now.</li>
            ) : (
              runs.map((run) => (
                <li key={run.id}>
                  <button
                    type="button"
                    className={`w-full rounded border px-3 py-2 text-left text-sm ${
                      selectedRunId === run.id
                        ? 'border-accent bg-ink'
                        : 'border-line bg-transparent hover:bg-ink/40'
                    }`}
                    onClick={() => setSelectedRunId(run.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-text">{run.jobName}</span>
                      <span className={statusClass(run.status)}>{run.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted">{run.summary || run.id}</p>
                  </button>
                </li>
              ))
            )}
          </ul>
          {selectedRun &&
          (selectedRun.status === 'failed' || selectedRun.status === 'queued') ? (
            <button
              type="button"
              disabled={pending}
              className="mt-3 rounded-md border border-line px-3 py-2 text-sm text-text disabled:opacity-40"
              onClick={() =>
                startTransition(() => {
                  void call({ action: 'retry', runId: selectedRun.id }, selectedRun.jobName)
                })
              }
            >
              Retry selected
            </button>
          ) : null}
        </div>

        <div className="rounded-md border border-line bg-panel/80 p-4">
          <h2 className="font-display text-lg font-bold">Run logs</h2>
          {selectedRun ? (
            <div className="mt-3 space-y-2 text-sm">
              <p className="text-muted">
                {selectedRun.id} · attempt {selectedRun.attempt}/{selectedRun.maxAttempts} ·{' '}
                {selectedRun.trigger}
              </p>
              {selectedRun.error ? (
                <p className="rounded border border-danger/30 bg-danger/10 px-2 py-1 text-xs text-danger">
                  {selectedRun.error}
                </p>
              ) : null}
              <pre className="max-h-72 overflow-auto rounded bg-ink p-3 text-xs text-accent-2">
                {(selectedRun.logs.length ? selectedRun.logs : ['No log lines']).join('\n')}
              </pre>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">Select a run to view logs.</p>
          )}
        </div>
      </div>
    </div>
  )
}
