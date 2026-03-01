import { useState, useRef, useEffect } from 'react'
import CommentBubble from './CommentBubble'

/**
 * Inner component: a single comment row with Edit/Approve controls for the creator.
 * Manages its own isEditing + draftText state.
 */
function CreatorBubbleRow({ item, autoReply, onEditReply, onApproveReply, onShowContext }) {
  const [isEditing, setIsEditing] = useState(false)
  const [draftText, setDraftText] = useState('')

  function startEdit() {
    setDraftText(item.editedReply ?? item.reply ?? '')
    setIsEditing(true)
  }

  function handleSave() {
    onEditReply(item.id, draftText.trim())
    setIsEditing(false)
  }

  function handleCancel() {
    setIsEditing(false)
  }

  const showControls = item.status === 'done' && !autoReply && !item.approved

  return (
    <div className="space-y-2">
      <CommentBubble item={item} onShowContext={onShowContext} />

      {/* Edit textarea (replaces the reply bubble text inline) */}
      {isEditing && item.status === 'done' && (
        <div className="pl-9 space-y-1.5">
          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            rows={3}
            className="w-full bg-slate-800/60 border border-neon-purple/40 focus:border-neon-purple/70 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-neon-purple/30 resize-none transition-colors"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!draftText.trim()}
              className="text-xs bg-neon-purple/80 hover:bg-neon-purple disabled:opacity-40 text-white rounded-lg px-3 py-1.5 transition-colors"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="text-xs bg-slate-700/60 hover:bg-slate-600/70 text-slate-300 rounded-lg px-3 py-1.5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edit / Approve action bar */}
      {showControls && !isEditing && (
        <div className="pl-9 flex items-center gap-2">
          <button
            onClick={startEdit}
            className="text-xs border border-slate-600/60 hover:border-neon-blue/50 text-slate-400 hover:text-neon-blue rounded-lg px-3 py-1 transition-colors"
          >
            ✏️ Edit
          </button>
          <button
            onClick={() => onApproveReply(item.id)}
            className="text-xs border border-emerald-600/50 hover:border-emerald-500 text-emerald-400 hover:text-emerald-300 rounded-lg px-3 py-1 transition-colors"
          >
            ✓ Approve
          </button>
        </div>
      )}

      {/* Approved badge */}
      {item.status === 'done' && item.approved && (
        <div className="pl-9">
          <span className="text-xs text-emerald-400 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
            ✓ Approved
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * Creator-facing comment panel with Edit/Approve controls.
 * Mirrors CommentPanel structure but maps thread through CreatorBubbleRow.
 */
export default function CreatorCommentPanel({
  thread,
  autoReply,
  onShowContext,
  onEditReply,
  onApproveReply,
}) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread.length])

  return (
    <div className="flex flex-col h-full">
      {/* Thread area — read-only */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {thread.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
            <div className="text-3xl">💬</div>
            <p className="text-slate-400 text-sm">
              Switch to the Follower view to submit comments. AI replies will appear here for review.
            </p>
          </div>
        ) : (
          thread.map((item) => (
            <CreatorBubbleRow
              key={item.id}
              item={item}
              autoReply={autoReply}
              onEditReply={onEditReply}
              onApproveReply={onApproveReply}
              onShowContext={onShowContext}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {!autoReply && thread.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-700/40">
          <p className="text-xs text-amber-400/70">
            Manual review mode — edit and approve replies before they post.
          </p>
        </div>
      )}
    </div>
  )
}
