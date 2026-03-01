import { useState, useRef, useEffect } from 'react'
import CommentBubble from './CommentBubble'
import { SAMPLE_COMMENTS } from '../data/sampleComments'

/**
 * Right panel: comment thread + input.
 * Shows pre-loaded quick-select chips and a free-text input.
 */
export default function CommentPanel({
  personaId,
  thread,
  autoReply,
  confidenceThreshold,
  onSubmitComment,
  onShowContext,
}) {
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const sampleComments = SAMPLE_COMMENTS[personaId] || []

  // Auto-scroll to bottom when thread grows
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread.length])

  function handleSubmit(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    onSubmitComment(text)
    setInput('')
  }

  function handleChipClick(comment) {
    onSubmitComment(comment)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Thread area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {thread.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
            <div className="text-3xl">💬</div>
            <p className="text-slate-400 text-sm">
              Select a quick comment below or type your own to see the AI generate a reply in this creator's voice.
            </p>
          </div>
        ) : (
          thread.map((item) => (
            <CommentBubble
              key={item.id}
              item={item}
              onShowContext={onShowContext}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick-select chips */}
      <div className="px-4 py-2 border-t border-slate-700/40">
        <p className="text-xs text-slate-500 mb-2">Quick comments:</p>
        <div className="flex flex-wrap gap-1.5">
          {sampleComments.map((c) => (
            <button
              key={c}
              onClick={() => handleChipClick(c)}
              className="text-xs bg-slate-700/60 hover:bg-slate-600/70 border border-slate-600/50 text-slate-300 hover:text-slate-100 rounded-full px-3 py-1 transition-colors"
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="px-4 pb-4 pt-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a comment..."
            maxLength={300}
            className="flex-1 bg-slate-800/60 border border-slate-600/50 focus:border-neon-purple/50 text-slate-200 placeholder-slate-500 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-neon-purple/30 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="bg-neon-purple/80 hover:bg-neon-purple disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl px-4 py-2.5 transition-colors whitespace-nowrap"
          >
            Send
          </button>
        </div>
        {!autoReply && (
          <p className="text-xs text-amber-400/70 mt-1.5 pl-1">
            Manual review mode — replies require approval before posting.
          </p>
        )}
      </form>
    </div>
  )
}
