import { useState, useRef, useEffect } from 'react'
import CommentBubble from './CommentBubble'

/**
 * A single comment row with Edit/Approve/Manual-Reply controls for the creator.
 */
function CreatorBubbleRow({ item, autoReply, onEditReply, onApproveReply, onShowContext, onManualReply }) {
  const [isEditing, setIsEditing] = useState(false)
  const [draftText, setDraftText] = useState('')
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualDraft, setManualDraft] = useState('')

  function startEdit() {
    setDraftText(item.editedReply ?? item.reply ?? '')
    setIsEditing(true)
  }

  function handleSave() {
    onEditReply(item.id, draftText.trim())
    setIsEditing(false)
  }

  function handleCancelEdit() {
    setIsEditing(false)
  }

  function handleUseAIDraft() {
    setManualDraft(item.editedReply ?? item.reply ?? '')
  }

  function handlePostManualReply() {
    const text = manualDraft.trim()
    if (!text) return
    onManualReply(item.id, text)
    setShowManualForm(false)
    setManualDraft('')
  }

  function handleCancelManual() {
    setShowManualForm(false)
    setManualDraft('')
  }

  const showControls = item.status === 'done' && !autoReply && !item.approved
  const showReplyButton = item.status === 'done' && !showManualForm && !item.manualReply

  return (
    <div className="space-y-2">
      <CommentBubble item={item} onShowContext={onShowContext} />

      {/* Edit textarea */}
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
              onClick={handleCancelEdit}
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

      {/* Manual reply button */}
      {showReplyButton && (
        <div className="pl-9">
          <button
            onClick={() => setShowManualForm(true)}
            className="text-xs border border-slate-600/60 hover:border-neon-blue/50 text-slate-400 hover:text-neon-blue rounded-lg px-3 py-1 transition-colors"
          >
            ↩️ Reply manually
          </button>
        </div>
      )}

      {/* Manual reply form */}
      {showManualForm && (
        <div className="pl-9 space-y-2">
          <textarea
            value={manualDraft}
            onChange={(e) => setManualDraft(e.target.value)}
            rows={3}
            placeholder="Write your reply..."
            className="w-full bg-slate-800/60 border border-slate-600/50 focus:border-neon-blue/50 text-slate-200 placeholder-slate-500 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-neon-blue/30 resize-none transition-colors"
          />
          <div className="flex items-center gap-2 flex-wrap">
            {(item.reply || item.editedReply) && (
              <button
                onClick={handleUseAIDraft}
                className="text-xs border border-neon-purple/40 text-neon-purple/80 hover:text-neon-purple rounded-lg px-3 py-1 transition-colors"
              >
                Use AI draft
              </button>
            )}
            <button
              onClick={handlePostManualReply}
              disabled={!manualDraft.trim()}
              className="text-xs bg-neon-blue/80 hover:bg-neon-blue disabled:opacity-40 text-white rounded-lg px-3 py-1.5 transition-colors"
            >
              Post Reply
            </button>
            <button
              onClick={handleCancelManual}
              className="text-xs bg-slate-700/60 hover:bg-slate-600/70 text-slate-300 rounded-lg px-3 py-1 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Manual reply display */}
      {item.manualReply && (
        <div className="flex items-start gap-2 pl-4">
          <div className="w-7 h-7 rounded-full bg-emerald-800/50 border border-emerald-600/40 flex items-center justify-center text-xs shrink-0">
            ✍️
          </div>
          <div className="flex-1 min-w-0">
            <div className="bg-surface-card border border-emerald-600/20 rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-slate-200">
              {item.manualReply.text}
            </div>
            <div className="mt-1.5 pl-1">
              <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-2 py-0.5">
                Manual
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Creator-facing comment panel with Edit/Approve/Manual-Reply controls.
 */
export default function CreatorCommentPanel({
  thread,
  autoReply,
  onShowContext,
  onEditReply,
  onApproveReply,
  onManualReply,
}) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread.length])

  return (
    <div className="flex flex-col h-full">
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
              onManualReply={onManualReply}
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
