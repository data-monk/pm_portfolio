import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const API_BASE = '/api/raas'

function StatCard({ label, value, color = 'text-white' }) {
  return (
    <div className="glass rounded-xl p-5 border border-surface-border">
      <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value ?? '—'}</p>
    </div>
  )
}

export default function AdminDashboard() {
  const { token } = useAuth()
  const [driveStatus, setDriveStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/admin/drive/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setDriveStatus)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="p-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-24 rounded-xl bg-surface-card animate-pulse border border-surface-border" />
          ))}
        </div>
      </div>
    )
  }

  const stats = driveStatus?.docStats ?? {}

  return (
    <div className="p-8 space-y-8 min-h-screen bg-surface">
      <div>
        <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: '#0891B2' }}>RaaS Admin</p>
        <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
        <p className="text-slate-400 text-sm">
          {driveStatus?.connected
            ? `Connected to "${driveStatus.folderName || driveStatus.folderId}"`
            : 'Drive not connected'}
          {driveStatus?.lastSyncAt && (
            <span className="ml-2 text-slate-500">
              · Last sync: {new Date(driveStatus.lastSyncAt).toLocaleString()}
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Ready" value={stats.READY ?? 0} color="text-emerald-400" />
        <StatCard label="Pending" value={stats.PENDING ?? 0} color="text-yellow-400" />
        <StatCard label="Ingesting" value={stats.INGESTING ?? 0} color="text-raas-light" />
        <StatCard label="Errors" value={stats.ERROR ?? 0} color="text-red-400" />
      </div>

      <div className="glass rounded-2xl p-6 border border-surface-border">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Links</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { href: '/apps/raas/admin/drive', label: 'Drive Connection', desc: 'Manage Google Drive integration' },
            { href: '/apps/raas/admin/docs', label: 'Documents', desc: 'View ingestion status' },
            { href: '/apps/raas/admin/prompts', label: 'System Prompts', desc: 'Create & manage prompts' },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="block p-4 rounded-xl bg-surface hover:bg-white/5 border border-surface-border transition-colors"
            >
              <p className="text-white font-medium text-sm">{item.label}</p>
              <p className="text-slate-400 text-xs mt-1">{item.desc}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
