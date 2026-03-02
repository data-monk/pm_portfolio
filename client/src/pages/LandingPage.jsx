import { useEffect, useState } from 'react'
import AppCard from '../components/AppCard'

// Fallback data shown while the API loads or if it fails
const FALLBACK_APPS = [
  {
    id: 1,
    title: 'EngageAI',
    summary:
      'RAG-powered TikTok comment responder: select a creator persona, submit a comment, and watch the AI generate a reply grounded in the creator\'s actual voice — with full retrieval context.',
    imageUrl: null,
    route: '/apps/creator-twin',
    tags: ['RAG', 'Pinecone', 'GPT-4o-mini', 'React'],
  },
  {
    id: 2,
    title: 'AI Chatbot',
    summary:
      'Conversational AI assistant with context memory, tool use, and a streaming UI — demonstrating end-to-end LLM product integration.',
    imageUrl: null,
    route: '/apps/app-2',
    tags: ['React', 'Claude API', 'Express', 'WebSockets'],
  },
  {
    id: 3,
    title: 'RAG as a Service',
    summary:
      'Multi-tenant knowledge base platform: connect a Google Drive folder, auto-ingest documents into Pinecone, manage system prompts, and run grounded research queries with full source citations.',
    imageUrl: null,
    route: '/apps/raas',
    tags: ['Pinecone', 'Claude Haiku', 'OpenAI Embeddings', 'Google Drive', 'Postgres'],
  },
]

export default function LandingPage() {
  const [apps, setApps] = useState(FALLBACK_APPS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/apps')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setApps(data)
      })
      .catch(() => {
        // Silently fall back to static data
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-6xl mx-auto px-6">
      {/* ── Hero Section ── */}
      <section
        id="about"
        className="pt-28 pb-20 flex flex-col sm:flex-row items-center gap-12"
      >
        {/* Profile Picture Placeholder */}
        <div className="flex-shrink-0">
          <div className="w-36 h-36 rounded-full bg-gradient-to-br from-neon-blue/30 via-surface-border to-neon-purple/30 border-2 border-neon-blue/30 flex items-center justify-center shadow-glow">
            <svg
              className="w-16 h-16 text-slate-600"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          </div>
        </div>

        {/* Bio */}
        <div>
          <p className="text-xs font-semibold tracking-widest text-neon-blue uppercase mb-3">
            Product Manager · AI · Builder
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-5">
            Shipping{' '}
            <span className="gradient-text">intelligent products</span>
            <br />
            that people love.
          </h1>
          <p className="text-slate-400 max-w-xl leading-relaxed">
            I'm an AI Tech PM obsessed with the intersection of
            machine learning, great UX, and fast execution. This portfolio is a
            living showcase of production-grade AI tools I've designed and
            built end-to-end.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#projects"
              className="px-6 py-2.5 rounded-full bg-neon-blue text-black font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              View Projects
            </a>
          </div>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="h-px bg-gradient-to-r from-transparent via-surface-border to-transparent" />

      {/* ── Portfolio Grid ── */}
      <section id="projects" className="py-20">
        <div className="mb-10">
          <p className="text-xs font-semibold tracking-widest text-neon-purple uppercase mb-2">
            Work
          </p>
          <h2 className="text-3xl font-bold text-white">Featured Projects</h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-72 rounded-2xl bg-surface-card animate-pulse border border-surface-border"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {apps.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
