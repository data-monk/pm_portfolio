import { useState, useCallback } from 'react'
import ContextDrawer from './components/ContextDrawer'
import ViewTabStrip from './components/ViewTabStrip'
import FollowerView from './views/FollowerView'
import CreatorView from './views/CreatorView'
import { PERSONA_MAP } from './data/personas'
import { DEFAULT_METRIC_KEYS } from './data/metricsData'

const API_BASE = import.meta.env.DEV ? 'http://localhost:5001' : ''

let nextId = 1

export default function CreatorTwinApp() {
  const [activeView, setActiveView] = useState('follower')
  const [personaId, setPersonaId] = useState('tech')
  const [autoReply, setAutoReply] = useState(true)
  const [confidenceThreshold, setConfidenceThreshold] = useState(50)

  // Thread: { id, comment, status, reply, confidence, retrievedContext, editedReply, approved, manualReply }
  const [thread, setThread] = useState([])

  const [creatorContext, setCreatorContext] = useState({
    transcript: PERSONA_MAP['tech'].videoDescription,
    notes: '',
  })

  const [guardrails, setGuardrails] = useState({
    preset: 'standard',
    enabled: ['nsw', 'sexual_violence', 'graphic_violence', 'hate_harassment', 'self_harm', 'personal_data', 'illegal'],
  })

  const [enabledMetrics, setEnabledMetrics] = useState(DEFAULT_METRIC_KEYS)

  const [replyAutomation, setReplyAutomation] = useState({
    mode: 'hybrid',
    confidenceThreshold: 60,
    minLikesToReply: 0,
    commentTypes: { questions: true, complaints: true, praise: true, requests: true },
    alwaysManual: {
      sensitiveTopics: true,
      highProfileUsers: false,
      keywords: ['price', 'refund', 'sponsor', 'medical', 'legal'],
    },
    rateLimits: { maxPerHour: 60, maxPerVideoPerDay: 200 },
    timingWindow: { enabled: false, maxHoursSincePublish: 24 },
    enableApprovalQueue: false,
  })

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerItem, setDrawerItem] = useState(null)

  function handlePersonaChange(newId) {
    setPersonaId(newId)
    setThread([])
    setCreatorContext((prev) => ({ ...prev, transcript: PERSONA_MAP[newId].videoDescription }))
  }

  function handleContextChange(field, value) {
    setCreatorContext((prev) => ({ ...prev, [field]: value }))
  }

  function handleGuardrailsChange(update) {
    setGuardrails((prev) => ({ ...prev, ...update }))
  }

  function handleMetricsChange(keys) {
    setEnabledMetrics(keys)
  }

  function handleReplyAutomationChange(update) {
    setReplyAutomation((prev) => ({ ...prev, ...update }))
  }

  function handleManualReply(id, replyText) {
    setThread((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              manualReply: {
                text: replyText,
                reply_type: 'manual',
                created_by: 'creator',
                created_at: new Date().toISOString(),
              },
            }
          : item
      )
    )
  }

  const handleSubmitComment = useCallback(async (comment) => {
    const id = nextId++
    setThread((prev) => [...prev, { id, comment, status: 'loading' }])

    try {
      const res = await fetch(`${API_BASE}/api/app-1/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment,
          personaId,
          transcript: creatorContext.transcript,
          notes: creatorContext.notes,
          guardrails: guardrails.enabled,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }

      const data = await res.json()

      setThread((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: 'done',
                reply: data.reply,
                confidence: data.confidence,
                retrievedContext: data.retrievedContext,
                editedReply: null,
                approved: false,
              }
            : item
        )
      )
    } catch (err) {
      console.error('[CreatorTwinApp] reply error:', err)
      setThread((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: 'error' } : item
        )
      )
    }
  }, [personaId, creatorContext, guardrails.enabled])

  function handleEditReply(id, newText) {
    setThread((prev) =>
      prev.map((item) => item.id === id ? { ...item, editedReply: newText } : item)
    )
  }

  function handleApproveReply(id) {
    setThread((prev) =>
      prev.map((item) => item.id === id ? { ...item, approved: true } : item)
    )
  }

  function handleShowContext(item) {
    setDrawerItem(item)
    setDrawerOpen(true)
  }

  return (
    <div className="min-h-screen bg-surface text-white">
      {/* Page header */}
      <div className="max-w-5xl mx-auto px-4 pt-8 pb-4">
        <h1 className="text-2xl md:text-3xl font-bold gradient-text mb-1">EngageAI for Creators</h1>
        <p className="text-slate-400 text-sm max-w-xl">
          EngageAI — AI-powered creator engagement copilot. Built a style-aware reply generation system using RAG to mimic creator tone and increase engagement.
        </p>
      </div>

      {/* View tab strip */}
      <ViewTabStrip activeView={activeView} onChange={setActiveView} />

      {/* Active view */}
      {activeView === 'follower' ? (
        <FollowerView
          personaId={personaId}
          onPersonaChange={handlePersonaChange}
          thread={thread}
          onSubmitComment={handleSubmitComment}
          onShowContext={handleShowContext}
        />
      ) : (
        <CreatorView
          personaId={personaId}
          onPersonaChange={handlePersonaChange}
          autoReply={autoReply}
          onToggleAutoReply={() => setAutoReply((v) => !v)}
          confidenceThreshold={confidenceThreshold}
          onChangeThreshold={setConfidenceThreshold}
          thread={thread}
          onShowContext={handleShowContext}
          onEditReply={handleEditReply}
          onApproveReply={handleApproveReply}
          onManualReply={handleManualReply}
          creatorContext={creatorContext}
          onContextChange={handleContextChange}
          guardrails={guardrails}
          onGuardrailsChange={handleGuardrailsChange}
          enabledMetrics={enabledMetrics}
          onMetricsChange={handleMetricsChange}
          replyAutomation={replyAutomation}
          onReplyAutomationChange={handleReplyAutomationChange}
        />
      )}

      {/* Context Drawer */}
      <ContextDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        contextItem={drawerItem}
      />
    </div>
  )
}
