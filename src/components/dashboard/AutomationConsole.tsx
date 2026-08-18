'use client'

import { useMemo, useState, useTransition } from 'react'
import type { AutomationJobDefinition, AutomationJobState, AutomationRunRecord } from '@/services/automation/types'

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
  const [pending, startTransition] = useTransition()

  const selectedRun = useMemo(
    () => runs.find((r) => r.id === selectedRunId) || null,
    [runs, selectedRunId]
  )

  async function call(body: Record<string, unknown>) {
    setError(null)
    const res = await fetch('/api/automation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'request_failed')
      return
    }
    if (data.states) setStates(data.states)
    if (data.runs) setRuns(data.runs)
    if (data.run?.id) setSelectedRunId(data.run.id)
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

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
              return (
                <tr key={job.name} className="border-t border-line/80 bg-panel/50">
                  <td className="px-3 py-3">
                    <p className="font-medium text-text">{job.label}</p>
                    <p className="text-xs text-muted">{job.description}</p>
                  </td>
                  <td className="px-3 py-3 text-text">
                    {state?.paused ? (
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
                        disabled={pending}
                        className="rounded border border-line px-2 py-1 text-xs text-text hover:bg-ink"
                        onClick={() =>
                          startTransition(() => {
                            void call({ action: 'run_now', jobName: job.name })
                          })
                        }
                      >
                        Run now
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        className="rounded border border-line px-2 py-1 text-xs text-text hover:bg-ink"
                        onClick={() =>
                          startTransition(() => {
                            void call({
                              action: state?.paused ? 'resume' : 'pause',
                              jobName: job.name,
                            })
                          })
                        }
                      >
                        {state?.paused ? 'Resume' : 'Pause'}
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
          {selectedRun && (selectedRun.status === 'failed' || selectedRun.status === 'queued') ? (
            <button
              type="button"
              disabled={pending}
              className="mt-3 rounded-md border border-line px-3 py-2 text-sm text-text"
              onClick={() =>
                startTransition(() => {
                  void call({ action: 'retry', runId: selectedRun.id })
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
