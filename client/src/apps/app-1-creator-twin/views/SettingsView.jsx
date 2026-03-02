import { useState } from 'react'
import { METRIC_CATALOG, DEFAULT_METRIC_KEYS } from '../data/metricsData'

// ─── Guardrails data ────────────────────────────────────────────────────────

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
    label: 'Standard',      desc: 'Balanced safety for general audiences', icon: '⚖️',
    enabled: ['nsw', 'sexual_violence', 'graphic_violence', 'hate_harassment', 'self_harm', 'personal_data', 'illegal'],
  },
  family: {
    label: 'Family-Friendly', desc: 'Maximum safety for all ages',         icon: '👨‍👩‍👧',
    enabled: ALL_GUARDRAIL_KEYS,
  },
  mature: {
    label: 'Mature Audience', desc: 'For 18+ creators, relaxes some restrictions', icon: '🔞',
    enabled: ['sexual_violence', 'graphic_violence', 'hate_harassment', 'self_harm', 'personal_data', 'illegal', 'medical', 'financial'],
  },
  strict: {
    label: 'Strict Brand Safety', desc: 'All guardrails on for brand-safe content', icon: '🛡️',
    enabled: ALL_GUARDRAIL_KEYS,
  },
}

function matchesPreset(enabled) {
  const sorted = [...enabled].sort()
  return Object.entries(PRESET_MAP).find(([, p]) => {
    const ps = [...p.enabled].sort()
    return ps.length === sorted.length && ps.every((v, i) => v === sorted[i])
  })
}

// ─── Settings groups ────────────────────────────────────────────────────────

const GROUPS = [
  { key: 'guardrails', label: 'Guardrails',        icon: '🛡️' },
  { key: 'metrics',    label: 'Dashboard Metrics', icon: '📊' },
  { key: 'automation', label: 'Reply Automation',  icon: '🤖' },
]

// ─── Toggle component ───────────────────────────────────────────────────────

function Toggle({ on, onChange }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 relative ${on ? 'bg-neon-purple/70' : 'bg-slate-700'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${on ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  )
}

// ─── Guardrails panel ───────────────────────────────────────────────────────

function GuardrailsPanel({ guardrails, onGuardrailsChange }) {
  function handlePresetClick(presetKey) {
    onGuardrailsChange({ preset: presetKey, enabled: [...PRESET_MAP[presetKey].enabled] })
  }

  function handleToggle(key) {
    const next = guardrails.enabled.includes(key)
      ? guardrails.enabled.filter((k) => k !== key)
      : [...guardrails.enabled, key]
    const match = matchesPreset(next)
    onGuardrailsChange({ preset: match ? match[0] : 'custom', enabled: next })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-slate-200">Reply Guardrails</h2>
        <p className="text-xs text-slate-500 mt-0.5">Control what topics the AI is allowed to include in generated replies.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
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
              {guardrails.preset === key && <span className="ml-auto text-neon-purple text-xs">●</span>}
            </div>
            <p className="text-xs text-slate-500 leading-tight">{preset.desc}</p>
          </button>
        ))}
      </div>

      {guardrails.preset === 'custom' && (
        <p className="text-xs text-neon-blue">Custom — toggles manually adjusted</p>
      )}

      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Individual Controls</p>
        {GUARDRAIL_ITEMS.map(({ key, label, desc }) => {
          const on = guardrails.enabled.includes(key)
          return (
            <div key={key} className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-700/30">
              <Toggle on={on} onChange={() => handleToggle(key)} />
              <div>
                <p className="text-xs font-medium text-slate-200">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Metrics panel ──────────────────────────────────────────────────────────

function groupByCategory(catalog) {
  return catalog.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})
}

function MetricsPanel({ enabledMetrics, onMetricsChange }) {
  const metricGroups = groupByCategory(METRIC_CATALOG)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">Dashboard Metrics</h2>
          <p className="text-xs text-slate-500 mt-0.5">{enabledMetrics.length} of {METRIC_CATALOG.length} metrics shown</p>
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
          {items.map(({ key, label, icon }) => (
            <label
              key={key}
              className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-700/30 cursor-pointer hover:border-slate-600/50 transition-colors"
            >
              <input
                type="checkbox"
                checked={enabledMetrics.includes(key)}
                onChange={() => {
                  const next = enabledMetrics.includes(key)
                    ? enabledMetrics.filter((k) => k !== key)
                    : [...enabledMetrics, key]
                  onMetricsChange(next)
                }}
                className="accent-purple-500 w-4 h-4 rounded"
              />
              <span className="text-base">{icon}</span>
              <span className="text-xs text-slate-200">{label}</span>
            </label>
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Reply Automation panel ─────────────────────────────────────────────────

const REPLY_MODES = [
  { value: 'manual_only',  label: 'Manual Only',          desc: 'AI drafts replies; creator approves before posting' },
  { value: 'auto_allowed', label: 'Auto Reply Allowed',   desc: 'System auto-posts when confidence and rules pass' },
  { value: 'hybrid',       label: 'Hybrid',               desc: 'AI drafts; auto-posts only for high-confidence + high-priority comments' },
]

const COMMENT_TYPE_LABELS = {
  questions:  { label: 'Questions',           desc: 'Comments with "?" or question intent' },
  complaints: { label: 'Complaints / Negative', desc: 'Negative sentiment or complaint comments' },
  praise:     { label: 'Praise / Positive',   desc: 'Positive and enthusiastic comments' },
  requests:   { label: 'Requests (links/pricing)', desc: 'Comments asking for prices, links, or details' },
}

function AutomationPanel({ replyAutomation, onReplyAutomationChange }) {
  const [newKeyword, setNewKeyword] = useState('')
  const [saved, setSaved] = useState(false)

  function update(patch) {
    onReplyAutomationChange(patch)
  }

  function handleAddKeyword() {
    const kw = newKeyword.trim().toLowerCase()
    if (!kw || replyAutomation.alwaysManual.keywords.includes(kw)) return
    update({ alwaysManual: { ...replyAutomation.alwaysManual, keywords: [...replyAutomation.alwaysManual.keywords, kw] } })
    setNewKeyword('')
  }

  function handleRemoveKeyword(kw) {
    update({ alwaysManual: { ...replyAutomation.alwaysManual, keywords: replyAutomation.alwaysManual.keywords.filter((k) => k !== kw) } })
  }

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const ra = replyAutomation

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-slate-200">Reply Automation</h2>
        <p className="text-xs text-slate-500 mt-0.5">Configure when EngageAI posts automatically vs. routes to your queue for review.</p>
      </div>

      {/* 1. Mode selector */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Auto Reply Mode</p>
        {REPLY_MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => update({ mode: m.value })}
            className={`w-full text-left rounded-xl p-3 border transition-colors flex items-start gap-3 ${
              ra.mode === m.value
                ? 'border-neon-purple/60 bg-neon-purple/10'
                : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600/60'
            }`}
          >
            <div className={`mt-0.5 w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${
              ra.mode === m.value ? 'border-neon-purple bg-neon-purple/60' : 'border-slate-600'
            }`} />
            <div>
              <p className={`text-xs font-semibold ${ra.mode === m.value ? 'text-neon-purple' : 'text-slate-300'}`}>{m.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{m.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* 2. Confidence threshold */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Confidence Threshold</p>
          <span className="text-xs font-mono text-neon-blue">{ra.confidenceThreshold}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={ra.confidenceThreshold}
          onChange={(e) => update({ confidenceThreshold: Number(e.target.value) })}
          className="w-full accent-purple-500"
        />
        <p className="text-xs text-slate-500">Auto-reply is blocked when model confidence is below this value. AI can still draft the reply for your review.</p>
      </div>

      {/* 3. Likes threshold */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Min Likes to Prioritize Reply</p>
        <input
          type="number"
          min={0}
          value={ra.minLikesToReply}
          onChange={(e) => update({ minLikesToReply: Math.max(0, Number(e.target.value)) })}
          className="w-28 bg-slate-800/60 border border-slate-600/50 focus:border-neon-purple/50 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none transition-colors"
        />
        <p className="text-xs text-slate-500">Comments with fewer likes may be drafted only or skipped depending on mode.</p>
      </div>

      {/* 4. Comment types */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Reply to Comment Types</p>
        {Object.entries(COMMENT_TYPE_LABELS).map(([key, { label, desc }]) => (
          <div key={key} className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-700/30">
            <Toggle
              on={ra.commentTypes[key]}
              onChange={(val) => update({ commentTypes: { ...ra.commentTypes, [key]: val } })}
            />
            <div>
              <p className="text-xs font-medium text-slate-200">{label}</p>
              <p className="text-xs text-slate-500">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 5. Always manual conditions */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Always Require Manual Approval</p>
        <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-700/30">
          <Toggle
            on={ra.alwaysManual.sensitiveTopics}
            onChange={(val) => update({ alwaysManual: { ...ra.alwaysManual, sensitiveTopics: val } })}
          />
          <div>
            <p className="text-xs font-medium text-slate-200">Sensitive topics</p>
            <p className="text-xs text-slate-500">Route to queue if comment matches guardrail-adjacent topics</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-700/30">
          <Toggle
            on={ra.alwaysManual.highProfileUsers}
            onChange={(val) => update({ alwaysManual: { ...ra.alwaysManual, highProfileUsers: val } })}
          />
          <div>
            <p className="text-xs font-medium text-slate-200">High-profile / verified users</p>
            <p className="text-xs text-slate-500">Always manually approve replies to verified accounts</p>
          </div>
        </div>

        {/* Keyword list */}
        <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/30 space-y-2">
          <p className="text-xs font-medium text-slate-300">Manual override keywords</p>
          <p className="text-xs text-slate-500">Route to queue if comment contains any of these words.</p>
          <div className="flex flex-wrap gap-1.5">
            {ra.alwaysManual.keywords.map((kw) => (
              <span
                key={kw}
                className="flex items-center gap-1 text-xs bg-slate-700/60 border border-slate-600/50 text-slate-300 rounded-full px-2.5 py-1"
              >
                {kw}
                <button
                  onClick={() => handleRemoveKeyword(kw)}
                  className="text-slate-500 hover:text-red-400 transition-colors ml-1 leading-none"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
              placeholder="Add keyword..."
              className="flex-1 bg-slate-800/60 border border-slate-600/50 focus:border-neon-purple/50 text-slate-200 placeholder-slate-500 text-xs rounded-lg px-3 py-1.5 focus:outline-none transition-colors"
            />
            <button
              onClick={handleAddKeyword}
              disabled={!newKeyword.trim()}
              className="text-xs bg-slate-700/60 hover:bg-slate-600/70 disabled:opacity-40 text-slate-300 rounded-lg px-3 py-1.5 transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* 6. Rate limits */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Rate Limits</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400">Max auto replies / hour</label>
            <input
              type="number"
              min={1}
              value={ra.rateLimits.maxPerHour}
              onChange={(e) => update({ rateLimits: { ...ra.rateLimits, maxPerHour: Math.max(1, Number(e.target.value)) } })}
              className="w-full bg-slate-800/60 border border-slate-600/50 focus:border-neon-purple/50 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400">Max auto replies / video / day</label>
            <input
              type="number"
              min={1}
              value={ra.rateLimits.maxPerVideoPerDay}
              onChange={(e) => update({ rateLimits: { ...ra.rateLimits, maxPerVideoPerDay: Math.max(1, Number(e.target.value)) } })}
              className="w-full bg-slate-800/60 border border-slate-600/50 focus:border-neon-purple/50 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* 7. Timing window */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Timing Window</p>
        <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-700/30">
          <Toggle
            on={ra.timingWindow.enabled}
            onChange={(val) => update({ timingWindow: { ...ra.timingWindow, enabled: val } })}
          />
          <div className="flex-1">
            <p className="text-xs font-medium text-slate-200">Limit replies to time window after publish</p>
            <p className="text-xs text-slate-500">Only auto-reply within N hours of video publish</p>
            {ra.timingWindow.enabled && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="number"
                  min={1}
                  value={ra.timingWindow.maxHoursSincePublish}
                  onChange={(e) => update({ timingWindow: { ...ra.timingWindow, maxHoursSincePublish: Math.max(1, Number(e.target.value)) } })}
                  className="w-20 bg-slate-800/60 border border-slate-600/50 focus:border-neon-purple/50 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none transition-colors"
                />
                <span className="text-xs text-slate-400">hours</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 8. Approval queue */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Approval Queue</p>
        <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/30 border border-slate-700/30">
          <Toggle
            on={ra.enableApprovalQueue}
            onChange={(val) => update({ enableApprovalQueue: val })}
          />
          <div>
            <p className="text-xs font-medium text-slate-200">Enable approval queue (Hybrid mode)</p>
            <p className="text-xs text-slate-500">AI-generated replies stage in a queue for you to approve, reject, or edit before posting</p>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          className="text-sm bg-neon-purple/80 hover:bg-neon-purple text-white font-medium rounded-xl px-5 py-2 transition-colors"
        >
          Save Settings
        </button>
        {saved && (
          <span className="text-xs text-emerald-400 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Saved
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Main SettingsView (macOS-style) ────────────────────────────────────────

export default function SettingsView({
  guardrails, onGuardrailsChange,
  enabledMetrics, onMetricsChange,
  replyAutomation, onReplyAutomationChange,
}) {
  const [activeGroup, setActiveGroup] = useState('guardrails')

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="glass rounded-2xl border border-slate-700/40 flex overflow-hidden" style={{ minHeight: '640px' }}>

        {/* Left sidebar */}
        <div className="w-52 flex-shrink-0 border-r border-slate-700/40 bg-slate-900/40 p-3 space-y-0.5">
          {GROUPS.map((g) => (
            <button
              key={g.key}
              onClick={() => setActiveGroup(g.key)}
              className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                activeGroup === g.key
                  ? 'bg-neon-purple/15 text-neon-purple border border-neon-purple/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span className="text-base">{g.icon}</span>
              <span className="font-medium text-xs">{g.label}</span>
            </button>
          ))}
        </div>

        {/* Right content panel */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeGroup === 'guardrails' && (
            <GuardrailsPanel guardrails={guardrails} onGuardrailsChange={onGuardrailsChange} />
          )}
          {activeGroup === 'metrics' && (
            <MetricsPanel enabledMetrics={enabledMetrics} onMetricsChange={onMetricsChange} />
          )}
          {activeGroup === 'automation' && (
            <AutomationPanel replyAutomation={replyAutomation} onReplyAutomationChange={onReplyAutomationChange} />
          )}
        </div>
      </div>
    </div>
  )
}
