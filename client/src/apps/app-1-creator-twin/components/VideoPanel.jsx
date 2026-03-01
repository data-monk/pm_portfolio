import { PERSONA_MAP } from '../data/personas'

/**
 * Left panel: static video thumbnail + creator info.
 * Mimics a TikTok video card with avatar, title, and niche tags.
 */
export default function VideoPanel({ personaId }) {
  const persona = PERSONA_MAP[personaId]
  if (!persona) return null

  // Dynamic gradient per persona
  const gradients = {
    tech: 'from-cyan-900/60 via-blue-900/40 to-surface-card',
    lifestyle: 'from-pink-900/60 via-purple-900/40 to-surface-card',
    fitness: 'from-orange-900/60 via-red-900/40 to-surface-card',
  }

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
    <div className={`rounded-2xl border ${borderColors[personaId]} bg-gradient-to-b ${gradients[personaId]} overflow-hidden flex flex-col h-full min-h-[320px]`}>
      {/* Video thumbnail area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4 relative">
        {/* Play button overlay feel */}
        <div className="relative">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-5xl shadow-2xl border-2 border-white/10"
            style={{ background: `${persona.accentColor}20` }}
          >
            {persona.avatar}
          </div>
          {/* Fake play badge */}
          <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow">
            <span className="text-slate-800 text-xs ml-0.5">▶</span>
          </div>
        </div>

        {/* Creator info */}
        <div className="text-center">
          <p className="text-white font-semibold text-sm">{persona.handle}</p>
          <p className="text-slate-400 text-xs mt-0.5">{persona.niche}</p>
        </div>

        {/* Video title */}
        <div className="w-full bg-black/30 rounded-xl px-3 py-2 text-center">
          <p className="text-white text-xs font-medium leading-snug">{persona.videoTitle}</p>
        </div>
      </div>

      {/* Bottom metadata strip */}
      <div className="px-4 pb-4 space-y-2">
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
            AI Creator Twin Demo
          </span>
        </div>
      </div>
    </div>
  )
}
