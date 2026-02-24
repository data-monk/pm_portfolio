import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const API_BASE = '/api/raas'

export default function DriveConnect() {
  const { token } = useAuth()
  const [searchParams] = useSearchParams()
  const justConnected = searchParams.get('connected') === '1'

  const [status, setStatus] = useState(null)
  const [folderId, setFolderId] = useState('')
  const [folderMsg, setFolderMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  async function fetchStatus() {
    const res = await fetch(`${API_BASE}/admin/drive/status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    setStatus(data)
  }

  useEffect(() => {
    fetchStatus().finally(() => setLoading(false))
  }, [token])

  async function handleConnect() {
    const res = await fetch(`${API_BASE}/admin/drive/connect`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (data.authUrl) window.location.href = data.authUrl
  }

  async function handleSetFolder(e) {
    e.preventDefault()
    setFolderMsg('')
    try {
      const res = await fetch(`${API_BASE}/admin/drive/folder`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setFolderMsg(`Folder set: "${data.folderName}"`)
      fetchStatus()
    } catch (err) {
      setFolderMsg(err.message)
    }
  }

  async function handleSync() {
    setSyncing(true)
    try {
      await fetch(`${API_BASE}/admin/drive/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      setFolderMsg('Sync started — check Documents for progress.')
    } catch {
      setFolderMsg('Sync failed.')
    } finally {
      setSyncing(false)
    }
  }

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>

  return (
    <div className="p-8 space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Google Drive Connection</h1>
        <p className="text-slate-400 text-sm">Connect a Drive folder to ingest as your knowledge base.</p>
      </div>

      {justConnected && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-emerald-400 text-sm">
          OAuth complete! Now enter your folder ID below.
        </div>
      )}

      {/* Connection status */}
      <div className="glass rounded-2xl p-6 border border-surface-border">
        <div className="flex items-center gap-3 mb-4">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              status?.connected ? 'bg-emerald-400' : 'bg-slate-600'
            }`}
          />
          <span className="text-white font-medium">
            {status?.connected ? 'Connected' : 'Not connected'}
          </span>
        </div>

        {status?.connected && (
          <div className="space-y-1 text-sm text-slate-400">
            <p>Folder: <span className="text-white">{status.folderName || status.folderId || '(not set)'}</span></p>
            <p>Status: <span className="text-white">{status.status}</span></p>
            {status.lastSyncAt && (
              <p>Last sync: <span className="text-white">{new Date(status.lastSyncAt).toLocaleString()}</span></p>
            )}
          </div>
        )}

        {!status?.connected && (
          <button
            onClick={handleConnect}
            className="mt-2 px-5 py-2.5 rounded-lg bg-neon-blue text-black font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Connect Google Drive
          </button>
        )}
      </div>

      {/* Set folder */}
      {status?.connected && (
        <div className="glass rounded-2xl p-6 border border-surface-border space-y-4">
          <h2 className="text-lg font-semibold text-white">Set Folder</h2>
          <p className="text-slate-400 text-sm">
            Paste your Google Drive folder ID (found in the folder URL).
          </p>
          <form onSubmit={handleSetFolder} className="flex gap-3">
            <input
              type="text"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs..."
              className="flex-1 bg-surface-DEFAULT border border-surface-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-neon-blue"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-lg bg-neon-blue text-black font-semibold text-sm hover:opacity-90"
            >
              Set
            </button>
          </form>
          {folderMsg && <p className="text-sm text-slate-400">{folderMsg}</p>}
        </div>
      )}

      {/* Manual sync */}
      {status?.connected && status?.folderId && (
        <div className="glass rounded-2xl p-6 border border-surface-border">
          <h2 className="text-lg font-semibold text-white mb-3">Manual Sync</h2>
          <p className="text-slate-400 text-sm mb-4">
            Trigger a sync now to pick up new or changed files.
          </p>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-5 py-2.5 rounded-lg border border-neon-blue text-neon-blue font-semibold text-sm hover:bg-neon-blue/10 transition-colors disabled:opacity-50"
          >
            {syncing ? 'Starting sync…' : 'Sync Now'}
          </button>
        </div>
      )}
    </div>
  )
}
