/**
 * Slide-in drawer showing the RAG retrieved context chunks.
 * Educates users on WHY the AI said what it said — key transparency feature.
 */
export default function ContextDrawer({ isOpen, onClose, contextItem }) {
  if (!contextItem) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-sm bg-surface-card border-l border-slate-700/60 z-50 flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700/60">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Why this reply?</h3>
            <p className="text-xs text-slate-400 mt-0.5">RAG retrieved context</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Comment being replied to */}
        <div className="p-4 border-b border-slate-700/40 bg-slate-800/30">
          <p className="text-xs text-slate-400 mb-1">Responding to:</p>
          <p className="text-sm text-slate-200 italic">"{contextItem.comment}"</p>
        </div>

        {/* Pipeline explanation */}
        <div className="px-4 pt-3 pb-2">
          <p className="text-xs text-slate-500">
            The AI embedded your comment, retrieved the 3 most similar past replies from this creator's history,
            then generated a new reply matching their exact tone.
          </p>
        </div>

        {/* Retrieved chunks */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Top retrieved examples:</p>
          {contextItem.retrievedContext && contextItem.retrievedContext.length > 0 ? (
            contextItem.retrievedContext.map((chunk, i) => (
              <div
                key={i}
                className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Example {i + 1}</span>
                  <span className="text-xs font-mono text-neon-blue bg-neon-blue/10 px-2 py-0.5 rounded-full">
                    {chunk.score}% match
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div>
                    <p className="text-xs text-slate-500">Comment:</p>
                    <p className="text-xs text-slate-300">"{chunk.comment}"</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Past reply:</p>
                    <p className="text-xs text-slate-300">"{chunk.reply}"</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500 italic">No context available for this reply.</p>
          )}
        </div>

        {/* Footer note */}
        <div className="p-4 border-t border-slate-700/40">
          <p className="text-xs text-slate-500">
            Confidence score reflects semantic similarity between the comment and the creator's past replies.
            Higher similarity → more grounded reply.
          </p>
        </div>
      </div>
    </>
  )
}
