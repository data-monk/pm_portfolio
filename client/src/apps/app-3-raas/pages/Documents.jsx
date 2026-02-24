import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const API_BASE = '/api/raas'

const STATUS_STYLES = {
  READY: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  INGESTING: 'bg-neon-blue/10 text-neon-blue border-neon-blue/30',
  ERROR: 'bg-red-500/10 text-red-400 border-red-500/30',
}

export default function Documents() {
  const { token } = useAuth()
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/admin/drive/documents`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setDocs)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="p-8 space-y-3">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-16 rounded-xl bg-surface-card animate-pulse border border-surface-border" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Documents</h1>
        <p className="text-slate-400 text-sm">{docs.length} document{docs.length !== 1 ? 's' : ''} found</p>
      </div>

      {docs.length === 0 ? (
        <div className="glass rounded-2xl p-10 border border-surface-border text-center">
          <p className="text-slate-400">No documents yet. Connect a Drive folder and run a sync.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-surface-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-card text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3 hidden md:table-cell">Chunks</th>
                <th className="text-left px-5 py-3 hidden lg:table-cell">Updated</th>
                <th className="text-left px-5 py-3 hidden lg:table-cell">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border bg-surface-DEFAULT">
              {docs.map((doc) => (
                <tr key={doc.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-5 py-3 text-white font-medium max-w-xs">
                    <p className="truncate">{doc.name}</p>
                    {doc.error_message && (
                      <p className="text-red-400 text-xs mt-0.5 truncate">{doc.error_message}</p>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        STATUS_STYLES[doc.status] ?? 'bg-slate-500/10 text-slate-400'
                      }`}
                    >
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-400 hidden md:table-cell">
                    {doc.chunk_count ?? 0}
                  </td>
                  <td className="px-5 py-3 text-slate-400 hidden lg:table-cell">
                    {new Date(doc.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 hidden lg:table-cell">
                    {doc.web_view_link && (
                      <a
                        href={doc.web_view_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neon-blue hover:underline text-xs"
                      >
                        View
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
