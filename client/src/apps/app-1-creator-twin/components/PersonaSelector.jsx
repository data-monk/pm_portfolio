import { PERSONAS } from '../data/personas'

/**
 * Dropdown to switch between the 3 demo creator personas.
 */
export default function PersonaSelector({ selectedId, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400 whitespace-nowrap">Creator:</span>
      <div className="relative">
        <select
          value={selectedId}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none bg-surface-card border border-slate-700 hover:border-neon-purple/50 text-slate-200 text-sm rounded-lg px-3 py-1.5 pr-8 focus:outline-none focus:ring-1 focus:ring-neon-purple/50 cursor-pointer transition-colors"
        >
          {PERSONAS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.avatar} {p.name}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-400 text-xs">
          ▾
        </div>
      </div>
    </div>
  )
}
