import { useEffect, useState } from 'react'
import AppCard from '../components/AppCard'

const ACCENT_MAP = { 1: 'blue', 3: 'teal', 4: 'violet' }

const FALLBACK_APPS = [
  {
    id: 1,
    title: 'EngageAI',
    summary:
      "RAG-powered comment responder: select a creator persona and watch the AI reply grounded in the creator's actual voice — with full retrieval context.",
    imageUrl: null,
    route: '/apps/creator-twin',
    tags: ['RAG', 'Pinecone', 'GPT-4o-mini', 'React'],
    accent: 'blue',
  },
  {
    id: 4,
    title: 'Violet Crumbs',
    summary:
      'Mobile-first food-sharing app for NYU Stern: discover free food from campus events, filter by dietary preferences, and track food waste impact in real time.',
    imageUrl: null,
    route: '/apps/violet-crumbs',
    tags: ['React', 'TypeScript', 'shadcn/ui', 'Framer Motion'],
    accent: 'violet',
  },
  {
    id: 3,
    title: 'RAG as a Service',
    summary:
      'Multi-tenant knowledge base platform: connect Google Drive, auto-ingest into Pinecone, manage system prompts, and run grounded queries with source citations.',
    imageUrl: null,
    route: '/apps/raas',
    tags: ['Pinecone', 'Claude Haiku', 'OpenAI Embeddings', 'Postgres'],
    accent: 'teal',
  },
]

const LIVE_SYSTEMS = [
  { name: 'EngageAI', desc: 'RAG pipeline' },
  { name: 'RAG as a Service', desc: 'Multi-tenant KB' },
  { name: 'Violet Crumbs', desc: 'Frontend app' },
]

export default function LandingPage() {
  const [apps, setApps] = useState(FALLBACK_APPS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/apps')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setApps(data.map((app) => ({ ...app, accent: ACCENT_MAP[app.id] || 'blue' })))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      {/* ── Hero — dark section ── */}
      <section
        id="about"
        className="bg-anz-navy"
        style={{ background: 'linear-gradient(160deg, #001E3C 0%, #003D66 60%, #005A8E 100%)' }}
      >
        <div className="max-w-6xl mx-auto px-6 pt-20 pb-0">
          <div className="flex flex-col lg:flex-row gap-16 items-start lg:items-center">

            {/* Left — headline + bio + CTAs */}
            <div className="flex-1 py-12">
              <p className="text-xs font-semibold tracking-[0.2em] text-blue-300 uppercase mb-6">
                AI · Product · Builder
              </p>
              <h1 className="text-6xl sm:text-7xl font-extrabold text-white leading-[1.04] tracking-tight mb-6">
                Building AI<br />
                products people<br />
                <span style={{ color: '#4DB8FF' }}>actually use.</span>
              </h1>
              <p className="text-blue-200 max-w-lg leading-relaxed text-base mb-10" style={{ color: '#93C5E8' }}>
                AI Tech PM obsessed with the intersection of machine learning, great UX, and fast
                execution. Every project here is production-grade — designed, built, and shipped.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="#projects"
                  className="inline-flex items-center px-7 py-3 rounded-full bg-white text-anz-navy font-semibold text-sm hover:bg-blue-50 transition-colors duration-200"
                >
                  View Projects
                </a>
                <a
                  href="https://www.linkedin.com/in/prasun-anand/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-7 py-3 rounded-full border border-white/25 text-white font-semibold text-sm hover:bg-white/10 transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  LinkedIn
                </a>
              </div>
            </div>

            {/* Right — profile card */}
            <div className="flex-shrink-0 lg:w-64 py-12">
              <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <div className="w-full aspect-square overflow-hidden">
                  <img src="/profile.jpeg" alt="Prasun Anand" className="w-full h-full object-cover" />
                </div>
                <div className="px-5 py-4">
                  <div className="text-sm font-semibold text-white">Prasun Anand</div>
                  <div className="text-xs mt-0.5" style={{ color: '#93C5E8' }}>AI Product Manager</div>
                </div>
              </div>
            </div>
          </div>

          {/* Status strip — pinned to hero bottom */}
          <div
            className="flex flex-wrap gap-x-8 gap-y-3 py-5 border-t"
            style={{ borderColor: 'rgba(255,255,255,0.10)' }}
          >
            <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#93C5E8' }}>
              3 products shipped
            </div>
            <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#93C5E8' }}>
              End-to-end built
            </div>
            <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#93C5E8' }}>
              RAG · LLMs · Vector DB
            </div>
            <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#93C5E8' }}>
              All production-grade
            </div>
          </div>
        </div>
      </section>

      {/* ── Projects — white section ── */}
      <section id="projects" className="bg-white">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="mb-12">
            <p className="text-xs font-semibold tracking-widest text-anz-blue uppercase mb-2">Work</p>
            <h2 className="text-3xl font-bold text-anz-navy tracking-tight">Featured Projects</h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-80 rounded-2xl bg-anz-surface animate-pulse border border-anz-border" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {apps.map((app) => (
                <AppCard key={app.id} app={app} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
