import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { isMongoConfigured, connectMongo } from '@/lib/db'
import { AuditLog } from '@/models/AuditLog'

export const dynamic = 'force-dynamic'

export default async function AuditPage() {
  let logs: Array<{
    id: string
    actor: string
    action: string
    entityType: string
    entityId: string | null
    status: string
    message: string
    createdAt: string
  }> = []

  if (isMongoConfigured()) {
    await connectMongo()
    const docs = await AuditLog.find({}).sort({ createdAt: -1 }).limit(80).lean()
    logs = docs.map((log) => ({
      id: String(log._id),
      actor: log.actor,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId || null,
      status: log.status,
      message: log.message || '',
      createdAt: log.createdAt ? new Date(log.createdAt).toISOString() : '',
    }))
  }

  return (
    <DashboardShell
      activePath="/dashboard/audit"
      title="Audit Logs"
      subtitle="Approve, reject, publish, and automation actions recorded for trust."
    >
      {!isMongoConfigured() ? (
        <p className="text-sm text-muted">Connect MongoDB to load audit logs.</p>
      ) : !logs.length ? (
        <p className="text-sm text-muted">
          No audit entries yet. Approve or reject an idea in Safety Queue to create the first log.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-line">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-panel text-xs uppercase tracking-[0.14em] text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Message</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-line/80">
                  <td className="px-4 py-3 text-muted whitespace-nowrap">
                    {log.createdAt ? log.createdAt.replace('T', ' ').slice(0, 19) : '—'}
                  </td>
                  <td className="px-4 py-3">{log.actor}</td>
                  <td className="px-4 py-3 text-accent-2">{log.action}</td>
                  <td className="px-4 py-3 text-muted">
                    {log.entityType}
                    {log.entityId ? ` · ${log.entityId.slice(0, 12)}` : ''}
                  </td>
                  <td className="px-4 py-3">{log.status}</td>
                  <td className="px-4 py-3 text-muted">{log.message || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  )
}
