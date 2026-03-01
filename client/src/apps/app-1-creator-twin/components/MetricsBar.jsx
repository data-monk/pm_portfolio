import { METRICS } from '../data/metricsData'

/**
 * 5 stat cards showing AI-impact metrics for the selected persona.
 * Updates when personaId changes.
 */
export default function MetricsBar({ personaId }) {
  const metrics = METRICS[personaId] || []

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {metrics.map((m) => (
        <div key={m.label} className="glass rounded-xl p-3 border border-slate-700/40">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-base">{m.icon}</span>
            <span className="text-xs text-slate-500 leading-tight">{m.label}</span>
          </div>
          <p className="text-xl font-bold gradient-text leading-none">{m.value}</p>
          {m.delta && (
            <p className="text-xs text-emerald-400 mt-1">{m.delta} vs baseline</p>
          )}
        </div>
      ))}
    </div>
  )
}
