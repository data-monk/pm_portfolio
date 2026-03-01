/**
 * Auto-reply vs. Manual-review toggle + confidence threshold control.
 * Shows product thinking: safety controls for creator autonomy.
 */
export default function ControlPanel({ autoReply, onToggleAutoReply, confidenceThreshold, onChangeThreshold }) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      {/* Auto/Manual toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">Mode:</span>
        <button
          onClick={onToggleAutoReply}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-neon-purple/50 ${
            autoReply ? 'bg-neon-purple/70' : 'bg-slate-600'
          }`}
          title={autoReply ? 'Auto-reply ON: replies post automatically' : 'Manual review: approve each reply first'}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
              autoReply ? 'translate-x-4' : 'translate-x-1'
            }`}
          />
        </button>
        <span className={`text-xs font-medium ${autoReply ? 'text-neon-purple' : 'text-slate-400'}`}>
          {autoReply ? 'Auto-reply' : 'Manual review'}
        </span>
      </div>

      {/* Confidence threshold */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 whitespace-nowrap">Min confidence:</span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={confidenceThreshold}
          onChange={(e) => onChangeThreshold(Number(e.target.value))}
          className="w-20 accent-neon-blue"
        />
        <span className="text-xs text-neon-blue font-mono w-8">{confidenceThreshold}%</span>
      </div>

      {/* Legend */}
      {!autoReply && (
        <span className="text-xs text-amber-400/80 italic">
          ⚠ Review mode: replies held for approval
        </span>
      )}
    </div>
  )
}
