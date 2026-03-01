/**
 * Slide-in drawer showing RAG retrieved context grouped by source type.
 * Educates users on WHY the AI said what it said — key transparency feature.
 */
export default function ContextDrawer({ isOpen, onClose, contextItem }) {
  if (!contextItem) return null

  const items = contextItem.retrievedContext || []
  // Backward-compat: items without doc_type treated as past_reply
  const transcriptChunks = items.filter((i) => i.doc_type === 'transcript_chunk')
  const creatorInfoChunks = items.filter((i) => i.doc_type === 'creator_info')
  const pastReplies = items.filter((i) => !i.doc_type || i.doc_type === 'past_reply')

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
            The AI embedded your comment, then retrieved relevant context from three sources: video transcript,
            creator notes, and similar past replies. All three inform the generated reply.
          </p>
        </div>

        {/* Retrieved chunks — grouped by source type */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">

          {/* Transcript Context */}
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Transcript Context</p>
            {transcriptChunks.length > 0 ? (
              transcriptChunks.map((chunk, i) => (
                <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
                  <p className="text-xs text-neon-purple mb-1">{chunk.label || 'From video transcript'}</p>
                  <p className="text-xs text-slate-300">{chunk.text}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-600 italic">Not available</p>
            )}
          </div>

          {/* Creator Notes */}
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Creator Notes</p>
            {creatorInfoChunks.length > 0 ? (
              creatorInfoChunks.map((chunk, i) => (
                <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
                  <p className="text-xs text-neon-blue mb-1">{chunk.label || 'From creator notes'}</p>
                  <p className="text-xs text-slate-300">{chunk.text}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-600 italic">Not available</p>
            )}
          </div>

          {/* Past Replies */}
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Past Replies</p>
            {pastReplies.length > 0 ? (
              pastReplies.map((chunk, i) => (
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
              <p className="text-xs text-slate-600 italic">Not available</p>
            )}
          </div>

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
