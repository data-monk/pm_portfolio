/**
 * Pill tab toggle for switching between Follower and Creator views.
 */
export default function ViewTabStrip({ activeView, onChange }) {
  const tabs = [
    { id: 'follower', label: '👤 Follower View' },
    { id: 'creator',  label: '🎬 Creator View' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-3 border-b border-slate-700/40">
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeView === tab.id
                ? 'bg-neon-purple/20 border border-neon-purple/50 text-neon-purple'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
