import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const API_BASE = '/api/raas'

function PromptForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [isDefault, setIsDefault] = useState(initial?.is_default ?? false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onSave({ name, description, content, isDefault })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-slate-400 mb-1.5">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={!!initial}
          className="w-full bg-surface border border-surface-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-neon-blue disabled:opacity-50"
        />
      </div>
      <div>
        <label className="block text-sm text-slate-400 mb-1.5">Description</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-surface border border-surface-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-neon-blue"
        />
      </div>
      <div>
        <label className="block text-sm text-slate-400 mb-1.5">System Prompt Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={8}
          className="w-full bg-surface border border-surface-border rounded-lg px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-neon-blue resize-none"
        />
      </div>
      {!initial && (
        <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="accent-neon-blue"
          />
          Set as default prompt
        </label>
      )}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-lg bg-neon-blue text-black font-semibold text-sm hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : initial ? 'Save New Version' : 'Create'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 rounded-lg border border-surface-border text-slate-400 text-sm hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function PromptManager() {
  const { token } = useAuth()
  const [prompts, setPrompts] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('list') // 'list' | 'create' | {editing: prompt}
  const [expandedId, setExpandedId] = useState(null)

  async function fetchPrompts() {
    const res = await fetch(`${API_BASE}/admin/prompts`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    setPrompts(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    fetchPrompts().finally(() => setLoading(false))
  }, [token])

  async function apiCall(url, method, body) {
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    return data
  }

  async function handleCreate(values) {
    await apiCall(`${API_BASE}/admin/prompts`, 'POST', values)
    await fetchPrompts()
    setMode('list')
  }

  async function handleEdit(prompt, values) {
    await apiCall(`${API_BASE}/admin/prompts/${prompt.id}`, 'PUT', values)
    await fetchPrompts()
    setMode('list')
  }

  async function handleDelete(id) {
    if (!confirm('Delete this prompt?')) return
    await apiCall(`${API_BASE}/admin/prompts/${id}`, 'DELETE')
    await fetchPrompts()
  }

  async function handleSetDefault(id) {
    await apiCall(`${API_BASE}/admin/prompts/${id}/set-default`, 'POST')
    await fetchPrompts()
  }

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">System Prompts</h1>
          <p className="text-slate-400 text-sm">{prompts.length} prompt{prompts.length !== 1 ? 's' : ''}</p>
        </div>
        {mode === 'list' && (
          <button
            onClick={() => setMode('create')}
            className="px-4 py-2 rounded-lg bg-neon-blue text-black font-semibold text-sm hover:opacity-90"
          >
            + New Prompt
          </button>
        )}
      </div>

      {mode === 'create' && (
        <div className="glass rounded-2xl p-6 border border-surface-border">
          <h2 className="text-lg font-semibold text-white mb-4">New Prompt</h2>
          <PromptForm onSave={handleCreate} onCancel={() => setMode('list')} />
        </div>
      )}

      {typeof mode === 'object' && mode.editing && (
        <div className="glass rounded-2xl p-6 border border-surface-border">
          <h2 className="text-lg font-semibold text-white mb-4">Edit: {mode.editing.name}</h2>
          <PromptForm
            initial={{ ...mode.editing, content: mode.editing.content ?? '' }}
            onSave={(values) => handleEdit(mode.editing, values)}
            onCancel={() => setMode('list')}
          />
        </div>
      )}

      <div className="space-y-3">
        {prompts.map((p) => (
          <div key={p.id} className="glass rounded-2xl border border-surface-border overflow-hidden">
            <div
              className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/5 transition-colors"
              onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
            >
              <div className="flex items-center gap-3">
                <span className="text-white font-medium">{p.name}</span>
                {p.is_default && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-neon-purple/10 text-neon-purple border border-neon-purple/30">
                    Default
                  </span>
                )}
                {p.version && (
                  <span className="text-slate-500 text-xs">v{p.version}</span>
                )}
              </div>
              <span className="text-slate-500 text-sm">{expandedId === p.id ? '▲' : '▼'}</span>
            </div>

            {expandedId === p.id && (
              <div className="px-5 pb-5 space-y-4 border-t border-surface-border">
                {p.description && <p className="text-slate-400 text-sm pt-3">{p.description}</p>}
                {p.content && (
                  <pre className="text-xs text-slate-300 bg-surface rounded-lg p-4 overflow-auto max-h-48 whitespace-pre-wrap font-mono">
                    {p.content}
                  </pre>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setMode({ editing: p })}
                    className="px-3 py-1.5 rounded-lg border border-surface-border text-slate-400 text-xs hover:text-white transition-colors"
                  >
                    Edit (new version)
                  </button>
                  {!p.is_default && (
                    <button
                      onClick={() => handleSetDefault(p.id)}
                      className="px-3 py-1.5 rounded-lg border border-neon-purple/30 text-neon-purple text-xs hover:bg-neon-purple/10 transition-colors"
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 text-xs hover:bg-red-500/10 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
