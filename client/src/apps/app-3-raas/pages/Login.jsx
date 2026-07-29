import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const API_BASE = '/api/raas'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname ?? '/apps/raas/research'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      let data
      try {
        data = await res.json()
      } catch {
        throw new Error(`Server unreachable (${res.status || 'no response'}) — ensure the API server is running`)
      }
      if (!res.ok) throw new Error(data.error || 'Login failed')
      login(data.token, data.user)
      navigate(data.user.role === 'ADMIN' ? '/apps/raas/admin' : from, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-5"
            style={{ background: 'rgba(14,116,144,0.15)', border: '1px solid rgba(14,116,144,0.30)' }}>
            <svg className="w-6 h-6" style={{ color: '#0891B2' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
          </div>
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: '#0891B2' }}>
            RAG as a Service
          </p>
          <h1 className="text-2xl font-bold text-white">Sign in</h1>
          <p className="text-slate-400 text-sm mt-1">Demo: admin@demo.com / admin123</p>
        </div>

        <div className="rounded-2xl p-8 border border-surface-border" style={{ background: '#111118' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface border border-surface-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none transition-colors"
                style={{ '--tw-ring-color': '#0E7490' }}
                onFocus={(e) => e.target.style.borderColor = '#0E7490'}
                onBlur={(e) => e.target.style.borderColor = ''}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface border border-surface-border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none transition-colors"
                onFocus={(e) => e.target.style.borderColor = '#0E7490'}
                onBlur={(e) => e.target.style.borderColor = ''}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg font-semibold text-sm text-white transition-opacity disabled:opacity-50"
              style={{ background: '#0E7490' }}
              onMouseEnter={(e) => e.target.style.background = '#0891B2'}
              onMouseLeave={(e) => e.target.style.background = '#0E7490'}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
