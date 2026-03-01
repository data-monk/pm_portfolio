import { METRIC_CATALOG, DEFAULT_METRIC_KEYS } from '../data/metricsData'

const GUARDRAIL_ITEMS = [
  { key: 'nsw',                label: 'No Profanity / Explicit Language',  desc: 'Block swear words and explicit language in AI replies' },
  { key: 'sexual_violence',    label: 'Sexual Violence',                   desc: 'Block any sexually violent or coercive content' },
  { key: 'graphic_violence',   label: 'Graphic Violence',                  desc: 'Block descriptions of gore or extreme physical harm' },
  { key: 'hate_harassment',    label: 'Hate Speech & Harassment',          desc: 'Block hateful, discriminatory, or harassing language' },
  { key: 'self_harm',          label: 'Self-Harm & Suicide',               desc: 'Avoid topics that could encourage self-harm' },
  { key: 'personal_data',      label: 'Personal Data Exposure',            desc: 'Do not repeat or infer personal details from comments' },
  { key: 'illegal',            label: 'Illegal Activity',                  desc: 'Avoid references to illegal acts or substances' },
  { key: 'medical',            label: 'Medical Claims',                    desc: 'No unverified health or medical advice in replies' },
  { key: 'financial',          label: 'Financial Advice',                  desc: 'No investment or financial recommendations' },
  { key: 'nsfw_18',            label: '18+ Content (mature themes)',       desc: 'Allow suggestive but non-explicit mature themes' },
  { key: 'competitor_mentions',label: 'Competitor Mentions',               desc: 'Avoid naming or referencing brand competitors' },
]

const ALL_GUARDRAIL_KEYS = GUARDRAIL_ITEMS.map((g) => g.key)

const PRESET_MAP = {
  standard: {
    label: 'Standard',
    desc: 'Balanced safety for general audiences',
    icon: '⚖️',
    enabled: ['nsw', 'sexual_violence', 'graphic_violence', 'hate_harassment', 'self_harm', 'personal_data', 'illegal'],
  },
  family: {
    label: 'Family-Friendly',
    desc: 'Maximum safety for all ages',
    icon: '👨‍👩‍👧',
    enabled: ALL_GUARDRAIL_KEYS,
  },
  mature: {
    label: 'Mature Audience',
    desc: 'For 18+ creators, relaxes some restrictions',
    icon: '🔞',
    enabled: ['sexual_violence', 'graphic_violence', 'hate_harassment', 'self_harm', 'personal_data', 'illegal', 'medical', 'financial'],
  },
  strict: {
    label: 'Strict Brand Safety',
    desc: 'All guardrails on for brand-safe content',
    icon: '🛡️',
    enabled: ALL_GUARDRAIL_KEYS,
  },
}

function groupByCategory(catalog) {
  return catalog.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})
}

function matchesPreset(enabled) {
  const sorted = [...enabled].sort()
  return Object.entries(PRESET_MAP).find(([, p]) => {
    const ps = [...p.enabled].sort()
    return ps.length === sorted.length && ps.every((v, i) => v === sorted[i])
  })
}

export default function SettingsView({ guardrails, onGuardrailsChange, enabledMetrics, onMetricsChange }) {
  const metricGroups = groupByCategory(METRIC_CATALOG)

  function handlePresetClick(presetKey) {
    onGuardrailsChange({ preset: presetKey, enabled: [...PRESET_MAP[presetKey].enabled] })
  }

  function handleToggle(key) {
    const current = guardrails.enabled
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key]
    const match = matchesPreset(next)
    onGuardrailsChange({ preset: match ? match[0] : 'custom', enabled: next })
  }

  function handleMetricToggle(key) {
    const next = enabledMetrics.includes(key)
      ? enabledMetrics.filter((k) => k !== key)
      : [...enabledMetrics, key]
    onMetricsChange(next)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">

      {/* ── Guardrails section ── */}
      <div className="glass rounded-2xl border border-slate-700/40 p-5 space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">Reply Guardrails</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Control what topics and content the AI is allowed to include in generated replies.
          </p>
        </div>

        {/* Preset cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(PRESET_MAP).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => handlePresetClick(key)}
              className={`text-left rounded-xl p-3 border transition-colors ${
                guardrails.preset === key
                  ? 'border-neon-purple/60 bg-neon-purple/10 text-slate-100'
                  : 'border-slate-700/50 bg-slate-800/40 text-slate-400 hover:border-slate-600/60'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{preset.icon}</span>
                <span className="text-xs font-semibold">{preset.label}</span>
                {guardrails.preset === key && (
                  <span className="ml-auto text-neon-purple text-xs">●</span>
                )}
              </div>
              <p className="text-xs text-slate-500 leading-tight">{preset.desc}</p>
            </button>
          ))}
        </div>

        {guardrails.preset === 'custom' && (
          <p className="text-xs text-neon-blue">Custom — toggles manually adjusted</p>
        )}

        {/* Individual toggles */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Individual Controls</p>
          {GUARDRAIL_ITEMS.map(({ key, label, desc }) => {
            const on = guardrails.enabled.includes(key)
            return (
              <div
                key={key}
                className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-700/30"
              >
                <button
                  onClick={() => handleToggle(key)}
                  className={`mt-0.5 w-9 h-5 rounded-full transition-colors flex-shrink-0 relative ${
                    on ? 'bg-neon-purple/70' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      on ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
                <div>
                  <p className="text-xs font-medium text-slate-200">{label}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Metrics section ── */}
      <div className="glass rounded-2xl border border-slate-700/40 p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Dashboard Metrics</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {enabledMetrics.length} of {METRIC_CATALOG.length} metrics shown
            </p>
          </div>
          <button
            onClick={() => onMetricsChange([...DEFAULT_METRIC_KEYS])}
            className="text-xs text-neon-blue hover:text-neon-blue/80 transition-colors"
          >
            Reset to defaults
          </button>
        </div>

        {Object.entries(metricGroups).map(([category, items]) => (
          <div key={category} className="space-y-2">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{category}</p>
            {items.map(({ key, label, icon }) => {
              const checked = enabledMetrics.includes(key)
              return (
                <label
                  key={key}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-700/30 cursor-pointer hover:border-slate-600/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleMetricToggle(key)}
                    className="accent-purple-500 w-4 h-4 rounded"
                  />
                  <span className="text-base">{icon}</span>
                  <span className="text-xs text-slate-200">{label}</span>
                </label>
              )
            })}
          </div>
        ))}
      </div>

    </div>
  )
}
