import { METRIC_CATALOG, METRICS, DEFAULT_METRIC_KEYS } from '../data/metricsData'

/**
 * Renders stat cards for the enabled metric keys in catalog order.
 * Falls back to DEFAULT_METRIC_KEYS if enabledMetrics is not provided.
 */
export default function MetricsBar({ personaId, enabledMetrics }) {
  const keys = enabledMetrics || DEFAULT_METRIC_KEYS
  const personaMetrics = METRICS[personaId] || {}

  const entries = METRIC_CATALOG
    .filter((cat) => keys.includes(cat.key))
    .map((cat) => ({
      ...cat,
      ...(personaMetrics[cat.key] || { value: '—', delta: null }),
    }))

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {entries.map((m) => (
        <div key={m.key} className="glass rounded-xl p-3 border border-slate-700/40">
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
