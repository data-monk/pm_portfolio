import { useState } from 'react'
import PersonaSelector from '../components/PersonaSelector'
import ControlPanel from '../components/ControlPanel'
import SwipeableVideoPanel from '../components/SwipeableVideoPanel'
import CreatorCommentPanel from '../components/CreatorCommentPanel'
import MetricsBar from '../components/MetricsBar'
import SettingsView from './SettingsView'

/**
 * Creator View — management dashboard.
 * Sub-tabs: Dashboard (context card + split screen + metrics + how it works) | Settings (guardrails + metrics config).
 */
export default function CreatorView({
  personaId,
  onPersonaChange,
  autoReply,
  onToggleAutoReply,
  confidenceThreshold,
  onChangeThreshold,
  thread,
  onShowContext,
  onEditReply,
  onApproveReply,
  creatorContext,
  onContextChange,
  guardrails,
  onGuardrailsChange,
  enabledMetrics,
  onMetricsChange,
}) {
  const [contextExpanded, setContextExpanded] = useState(false)
  const [creatorTab, setCreatorTab] = useState('dashboard')

  const hasCustomContext = creatorContext.notes && creatorContext.notes.trim().length > 0

  return (
    <>
      {/* Controls bar */}
      <div className="max-w-5xl mx-auto px-4 py-3 border-b border-slate-700/40 bg-surface-card/40">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <PersonaSelector selectedId={personaId} onChange={onPersonaChange} />
          <ControlPanel
            autoReply={autoReply}
            onToggleAutoReply={onToggleAutoReply}
            confidenceThreshold={confidenceThreshold}
            onChangeThreshold={onChangeThreshold}
          />
        </div>
      </div>

      {/* Sub-tab strip */}
      <div className="max-w-5xl mx-auto px-4 pt-3">
        <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1 w-fit border border-slate-700/40">
          {[
            { key: 'dashboard', label: '📊 Dashboard' },
            { key: 'settings',  label: '⚙️ Settings'  },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setCreatorTab(key)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                creatorTab === key
                  ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {creatorTab === 'settings' ? (
        <SettingsView
          guardrails={guardrails}
          onGuardrailsChange={onGuardrailsChange}
          enabledMetrics={enabledMetrics}
          onMetricsChange={onMetricsChange}
        />
      ) : (
        <>
          {/* Creator Context card */}
          <div className="max-w-5xl mx-auto px-4 pt-4">
            <div className="glass rounded-2xl border border-slate-700/40">
              <button
                onClick={() => setContextExpanded((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-slate-300">
                  <span>📋</span>
                  <span>Creator Context</span>
                  {hasCustomContext ? (
                    <span className="text-xs bg-neon-purple/20 text-neon-purple border border-neon-purple/30 rounded-full px-2 py-0.5">
                      Custom context active
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">Using default context</span>
                  )}
                </span>
                <span className="text-slate-500 text-xs">{contextExpanded ? '▲ Collapse' : '▼ Expand'}</span>
              </button>

              {contextExpanded && (
                <div className="px-4 pb-4 border-t border-slate-700/40 pt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-400">
                      Video Transcript / Description
                    </label>
                    <textarea
                      rows={5}
                      value={creatorContext.transcript}
                      onChange={(e) => onContextChange('transcript', e.target.value)}
                      placeholder="Describe the video this comment is about..."
                      className="bg-slate-800/60 border border-slate-600/50 focus:border-neon-purple/50 text-slate-200 placeholder-slate-500 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-neon-purple/30 resize-none transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-400">
                      Additional Creator Notes
                    </label>
                    <textarea
                      rows={5}
                      value={creatorContext.notes}
                      onChange={(e) => onContextChange('notes', e.target.value)}
                      placeholder="E.g. Promoting a product this week, avoid mentioning competitors, emphasize community..."
                      className="bg-slate-800/60 border border-slate-600/50 focus:border-neon-purple/50 text-slate-200 placeholder-slate-500 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-neon-purple/30 resize-none transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Split-screen layout */}
          <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 h-[560px]">
              <SwipeableVideoPanel personaId={personaId} onPersonaChange={onPersonaChange} />
              <div className="glass rounded-2xl border border-slate-700/40 overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-slate-700/40 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-200">💬 Comments</span>
                  <span className="text-xs text-slate-500">{thread.length} exchange{thread.length !== 1 ? 's' : ''}</span>
                </div>
                <CreatorCommentPanel
                  thread={thread}
                  autoReply={autoReply}
                  onShowContext={onShowContext}
                  onEditReply={onEditReply}
                  onApproveReply={onApproveReply}
                />
              </div>
            </div>

            {/* Metrics bar */}
            <MetricsBar personaId={personaId} enabledMetrics={enabledMetrics} />

            {/* How it works */}
            <div className="glass rounded-2xl border border-slate-700/40 p-5">
              <h2 className="text-sm font-semibold text-slate-300 mb-3">How the RAG pipeline works</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { step: '1', icon: '📥', label: 'Embed',    desc: 'Comment is vectorized using Pinecone multilingual-e5-large' },
                  { step: '2', icon: '🔍', label: 'Retrieve', desc: 'Top-3 similar past replies fetched from creator namespace' },
                  { step: '3', icon: '🤖', label: 'Generate', desc: 'GPT-4o-mini generates a reply grounded in retrieved context' },
                  { step: '4', icon: '📊', label: 'Score',    desc: 'Confidence score from cosine similarity of top match' },
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
        </>
      )}
    </>
  )
}
