import { PERSONA_MAP } from '../data/personas'

/**
 * Left panel: static video thumbnail + creator info.
 * Displays an animated GIF in the upper portion, mimicking a TikTok video card.
 */
export default function VideoPanel({ personaId }) {
  const persona = PERSONA_MAP[personaId]
  if (!persona) return null

  const borderColors = {
    tech: 'border-cyan-500/30',
    lifestyle: 'border-pink-500/30',
    fitness: 'border-orange-500/30',
  }

  const tagColors = {
    tech: 'bg-cyan-900/40 text-cyan-300 border-cyan-700/40',
    lifestyle: 'bg-pink-900/40 text-pink-300 border-pink-700/40',
    fitness: 'bg-orange-900/40 text-orange-300 border-orange-700/40',
  }

  return (
    <div className={`rounded-2xl border ${borderColors[personaId]} bg-surface-card overflow-hidden flex flex-col h-full min-h-[320px]`}>
      {/* GIF video area */}
      <div className="flex-1 relative overflow-hidden min-h-0">
        <img
          src={persona.gifUrl}
          alt={persona.videoTitle}
          className="w-full h-full object-cover"
        />
        {/* Overlay: creator handle + video title at bottom of GIF area */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3">
          <p className="text-white font-semibold text-sm">{persona.handle}</p>
          <p className="text-slate-300 text-xs mt-0.5 leading-snug">{persona.videoTitle}</p>
        </div>
      </div>

      {/* Bottom metadata strip */}
      <div className="px-4 py-3 space-y-2 bg-surface-card">
        <p className="text-slate-400 text-xs leading-relaxed">{persona.videoDescription}</p>

        {/* Fake engagement stats */}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>❤️ 24.3K</span>
          <span>💬 847</span>
          <span>↗️ 1.2K</span>
        </div>

        {/* Tag */}
        <div>
          <span className={`inline-block text-xs px-2 py-0.5 rounded-full border ${tagColors[personaId]}`}>
            EngageAI for Creators
          </span>
        </div>
      </div>
    </div>
  )
}
