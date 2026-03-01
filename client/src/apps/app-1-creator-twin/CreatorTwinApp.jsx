import { useState, useCallback } from 'react'
import PersonaSelector from './components/PersonaSelector'
import ControlPanel from './components/ControlPanel'
import VideoPanel from './components/VideoPanel'
import CommentPanel from './components/CommentPanel'
import ContextDrawer from './components/ContextDrawer'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001'

let nextId = 1

/**
 * AI Creator Twin — Top-level layout component.
 *
 * TikTok-inspired split-screen: left = video panel, right = comment thread.
 * RAG pipeline: embed comment → retrieve from Pinecone → generate reply via GPT-4o-mini.
 */
export default function CreatorTwinApp() {
  const [personaId, setPersonaId] = useState('tech')
  const [autoReply, setAutoReply] = useState(true)
  const [confidenceThreshold, setConfidenceThreshold] = useState(50)

  // Thread: array of { id, comment, status, reply, confidence, retrievedContext }
  const [thread, setThread] = useState([])

  // Context drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerItem, setDrawerItem] = useState(null)

  // Clear thread when persona changes
  function handlePersonaChange(newId) {
    setPersonaId(newId)
    setThread([])
  }

  const handleSubmitComment = useCallback(async (comment) => {
    const id = nextId++
    // Add pending item to thread
    setThread((prev) => [...prev, { id, comment, status: 'loading' }])

    try {
      const res = await fetch(`${API_BASE}/api/app-1/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment, personaId }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }

      const data = await res.json()

      setThread((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: 'done',
                reply: data.reply,
                confidence: data.confidence,
                retrievedContext: data.retrievedContext,
              }
            : item
        )
      )
    } catch (err) {
      console.error('[CreatorTwinApp] reply error:', err)
      setThread((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: 'error' } : item
        )
      )
    }
  }, [personaId])

  function handleShowContext(item) {
    setDrawerItem(item)
    setDrawerOpen(true)
  }

  return (
    <div className="min-h-screen bg-surface text-white">
      {/* Page header */}
      <div className="max-w-5xl mx-auto px-4 pt-8 pb-4">
        <div className="mb-1">
          <span className="text-xs text-neon-blue font-mono tracking-widest uppercase">App 1 — RAG Pipeline Demo</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold gradient-text mb-1">AI Creator Twin</h1>
        <p className="text-slate-400 text-sm max-w-xl">
          Select a creator persona. Submit a comment. Watch the AI generate a reply grounded in that creator's actual voice — powered by RAG.
        </p>
      </div>

      {/* Controls bar */}
      <div className="max-w-5xl mx-auto px-4 py-3 border-y border-slate-700/40 bg-surface-card/40">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <PersonaSelector selectedId={personaId} onChange={handlePersonaChange} />
          <ControlPanel
            autoReply={autoReply}
            onToggleAutoReply={() => setAutoReply((v) => !v)}
            confidenceThreshold={confidenceThreshold}
            onChangeThreshold={setConfidenceThreshold}
          />
        </div>
      </div>

      {/* Split-screen layout */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 h-[560px]">
          {/* Left: Video panel */}
          <VideoPanel personaId={personaId} />

          {/* Right: Comment panel */}
          <div className="glass rounded-2xl border border-slate-700/40 overflow-hidden flex flex-col">
            {/* Comment panel header */}
            <div className="px-4 py-3 border-b border-slate-700/40 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-200">💬 Comments</span>
              <span className="text-xs text-slate-500">{thread.length} exchange{thread.length !== 1 ? 's' : ''}</span>
            </div>

            <CommentPanel
              personaId={personaId}
              thread={thread}
              autoReply={autoReply}
              confidenceThreshold={confidenceThreshold}
              onSubmitComment={handleSubmitComment}
              onShowContext={handleShowContext}
            />
          </div>
        </div>
      </div>

      {/* How it works section */}
      <div className="max-w-5xl mx-auto px-4 pb-10">
        <div className="glass rounded-2xl border border-slate-700/40 p-5">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">How the RAG pipeline works</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { step: '1', icon: '📥', label: 'Embed', desc: 'Comment is vectorized using Pinecone multilingual-e5-large' },
              { step: '2', icon: '🔍', label: 'Retrieve', desc: 'Top-3 similar past replies fetched from creator namespace' },
              { step: '3', icon: '🤖', label: 'Generate', desc: 'GPT-4o-mini generates a reply grounded in retrieved context' },
              { step: '4', icon: '📊', label: 'Score', desc: 'Confidence score from cosine similarity of top match' },
            ].map(({ step, icon, label, desc }) => (
              <div key={step} className="bg-slate-800/40 rounded-xl p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{icon}</span>
                  <span className="text-xs font-semibold text-slate-200">{step}. {label}</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Context Drawer */}
      <ContextDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        contextItem={drawerItem}
      />
    </div>
  )
}
