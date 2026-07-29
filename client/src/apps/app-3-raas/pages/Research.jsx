import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import SourceCitation from '../components/SourceCitation'

const API_BASE = '/api/raas'

export default function Research() {
  const { token, user, logout } = useAuth()
  const [prompts, setPrompts] = useState([])
  const [selectedPromptId, setSelectedPromptId] = useState('')
  const [query, setQuery] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${API_BASE}/prompts`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPrompts(data)
          const def = data.find((p) => p.is_default)
          if (def) setSelectedPromptId(def.id)
        }
      })
      .catch(() => {})
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!query.trim()) return
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/research/query`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          promptId: selectedPromptId || undefined,
          topK: 8,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Top bar */}
      <header className="border-b border-surface-border px-6 py-4 flex items-center justify-between" style={{ background: '#0d1a1e' }}>
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors duration-200 group"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Portfolio
          </Link>
          <div>
            <p className="text-xs font-bold tracking-widest uppercase" style={{ color: '#0891B2' }}>RAG as a Service</p>
            <h1 className="text-lg font-bold text-white">Research</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {user?.role === 'ADMIN' && (
            <a href="/apps/raas/admin" className="text-xs text-slate-400 hover:text-white">
              Admin →
            </a>
          )}
          <button
            onClick={() => { logout(); window.location.href = '/apps/raas/login' }}
            className="text-xs text-slate-400 hover:text-red-400"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-8 space-y-6">
        {/* Query form */}
        <div className="glass rounded-2xl p-6 border border-surface-border space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">System Prompt</label>
            <select
              value={selectedPromptId}
              onChange={(e) => setSelectedPromptId(e.target.value)}
              className="w-full bg-surface border border-surface-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:outline-none"
            >
              <option value="">— Use default —</option>
              {prompts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.is_default ? ' (default)' : ''}
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Your Question</label>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={4}
                required
                placeholder="Ask anything about your knowledge base…"
                className="w-full bg-surface border border-surface-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:outline-none resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="w-full py-2.5 rounded-lg text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ background: '#0E7490' }}
            >
              {loading ? 'Searching & generating…' : 'Run Research'}
            </button>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            <div className="glass rounded-2xl p-6 border border-surface-border space-y-3">
              <div className="h-4 rounded bg-surface-card animate-pulse w-1/3" />
              <div className="h-4 rounded bg-surface-card animate-pulse w-full" />
              <div className="h-4 rounded bg-surface-card animate-pulse w-4/5" />
              <div className="h-4 rounded bg-surface-card animate-pulse w-2/3" />
            </div>
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <div className="space-y-6">
            {/* Answer */}
            <div className="glass rounded-2xl p-6 border border-surface-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Answer</h2>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>{result.model}</span>
                  <span>{result.latencyMs}ms</span>
                  <span>{result.chunksRetrieved} chunk{result.chunksRetrieved !== 1 ? 's' : ''} retrieved</span>
                </div>
              </div>
              <div className="prose prose-sm prose-invert max-w-none text-slate-200">
                <ReactMarkdown>{result.answer}</ReactMarkdown>
              </div>
            </div>

            {/* Sources */}
            {result.sources && result.sources.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
                  Sources ({result.sources.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {result.sources.map((src, i) => (
                    <SourceCitation key={i} source={src} index={i} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
