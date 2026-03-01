import { useState } from 'react'

/**
 * A single comment + AI reply pair in the comment thread.
 */
export default function CommentBubble({ item, onShowContext }) {
  const [expanded, setExpanded] = useState(false)

  const confidenceColor =
    item.confidence >= 80
      ? 'text-emerald-400'
      : item.confidence >= 55
      ? 'text-yellow-400'
      : 'text-red-400'

  const confidenceLabel =
    item.confidence >= 80 ? 'High' : item.confidence >= 55 ? 'Medium' : 'Low'

  return (
    <div className="space-y-1.5">
      {/* User comment */}
      <div className="flex items-start gap-2">
        <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
          U
        </div>
        <div className="bg-slate-700/60 rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-slate-200 max-w-[85%]">
          {item.comment}
        </div>
      </div>

      {/* AI reply */}
      {item.status === 'loading' && (
        <div className="flex items-start gap-2 pl-4">
          <div className="w-7 h-7 rounded-full bg-neon-purple/30 border border-neon-purple/40 flex items-center justify-center text-sm shrink-0">
            🤖
          </div>
          <div className="bg-surface-card border border-slate-700/50 rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-slate-400">
            <span className="inline-flex gap-1">
              <span className="animate-bounce" style={{ animationDelay: '0ms' }}>●</span>
              <span className="animate-bounce" style={{ animationDelay: '150ms' }}>●</span>
              <span className="animate-bounce" style={{ animationDelay: '300ms' }}>●</span>
            </span>
          </div>
        </div>
      )}

      {item.status === 'done' && (
        <div className="flex items-start gap-2 pl-4">
          <div className="w-7 h-7 rounded-full bg-neon-purple/30 border border-neon-purple/40 flex items-center justify-center text-sm shrink-0">
            🤖
          </div>
          <div className="flex-1 min-w-0">
            <div className="bg-surface-card border border-neon-purple/20 rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-slate-200">
              {item.reply}
            </div>
            {/* Metadata row */}
            <div className="flex items-center gap-2 mt-1.5 pl-1 flex-wrap">
              {/* Confidence badge */}
              <span className={`text-xs font-medium ${confidenceColor} flex items-center gap-1`}>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" />
                {confidenceLabel} confidence ({item.confidence}%)
              </span>
              {/* Context button */}
              {item.retrievedContext && item.retrievedContext.length > 0 && (
                <button
                  onClick={() => onShowContext(item)}
                  className="text-xs text-neon-blue/70 hover:text-neon-blue transition-colors underline underline-offset-2"
                >
                  why this reply?
                </button>
              )}
              {/* Expand/collapse for long replies */}
            </div>
          </div>
        </div>
      )}

      {item.status === 'error' && (
        <div className="flex items-start gap-2 pl-4">
          <div className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center text-sm shrink-0">
            ⚠️
          </div>
          <div className="bg-red-900/20 border border-red-700/40 rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-red-400">
            Failed to generate reply. Check your connection.
          </div>
        </div>
      )}
    </div>
  )
}
