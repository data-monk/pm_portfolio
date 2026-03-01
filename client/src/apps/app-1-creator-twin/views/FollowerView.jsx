import SwipeableVideoPanel from '../components/SwipeableVideoPanel'
import CommentPanel from '../components/CommentPanel'

/**
 * Follower View — immersive TikTok-style experience.
 * No creator controls visible. Auto-reply always on, threshold 0.
 * Persona navigation via swipe only.
 */
export default function FollowerView({
  personaId,
  onPersonaChange,
  thread,
  onSubmitComment,
  onShowContext,
}) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 h-[560px]">
        {/* Left: Swipeable video panel */}
        <SwipeableVideoPanel personaId={personaId} onPersonaChange={onPersonaChange} />

        {/* Right: Comment panel */}
        <div className="glass rounded-2xl border border-slate-700/40 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-700/40 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-200">💬 Comments</span>
            <span className="text-xs text-slate-500">{thread.length} exchange{thread.length !== 1 ? 's' : ''}</span>
          </div>
          <CommentPanel
            personaId={personaId}
            thread={thread}
            autoReply={true}
            confidenceThreshold={0}
            onSubmitComment={onSubmitComment}
            onShowContext={onShowContext}
            showMeta={false}
          />
        </div>
      </div>
    </div>
  )
}
