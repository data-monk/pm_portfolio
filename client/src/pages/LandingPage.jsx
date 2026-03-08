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
    id: 4,
    title: 'Violet Crumbs',
    summary:
      'Mobile-first food-sharing app for NYU Stern: discover free food from campus events in real time, filter by dietary preferences, post excess catering, and track campus-wide food waste impact.',
    imageUrl: null,
    route: '/apps/violet-crumbs',
    tags: ['React', 'TypeScript', 'shadcn/ui', 'Framer Motion', 'Tailwind CSS'],
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
        {/* Profile Picture */}
        <div className="flex-shrink-0">
          <div className="w-36 h-36 rounded-full border-2 border-neon-blue/30 shadow-glow overflow-hidden">
            <img
              src="/profile.jpeg"
              alt="Prasun Anand"
              className="w-full h-full object-cover"
            />
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
              className="inline-flex items-center px-6 py-2.5 rounded-full bg-neon-blue text-black font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              View Projects
            </a>
            <a
              href="https://www.linkedin.com/in/prasun-anand/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-neon-blue/30 text-neon-blue hover:bg-neon-blue/10 transition-colors text-sm font-semibold"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              LinkedIn
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
