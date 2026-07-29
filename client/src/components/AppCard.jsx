import { useNavigate } from 'react-router-dom'

const ACCENTS = {
  blue: {
    gradient: 'linear-gradient(135deg, #0057A8 0%, #00A8E8 100%)',
    badge: '#007DC3',
    badgeBg: 'rgba(0,125,195,0.10)',
    badgeBorder: 'rgba(0,125,195,0.22)',
  },
  teal: {
    gradient: 'linear-gradient(135deg, #064E6E 0%, #0E9DB8 100%)',
    badge: '#0E7490',
    badgeBg: 'rgba(14,116,144,0.10)',
    badgeBorder: 'rgba(14,116,144,0.22)',
  },
  violet: {
    gradient: 'linear-gradient(135deg, #4C1D95 0%, #9333EA 100%)',
    badge: '#6D28D9',
    badgeBg: 'rgba(109,40,217,0.09)',
    badgeBorder: 'rgba(109,40,217,0.20)',
  },
}

export default function AppCard({ app }) {
  const navigate = useNavigate()
  const { title, summary, imageUrl, route, tags, accent = 'blue' } = app
  const a = ACCENTS[accent] ?? ACCENTS.blue

  return (
    <article
      onClick={() => navigate(route)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(route)}
      className="
        group relative flex flex-col overflow-hidden rounded-2xl cursor-pointer
        bg-white border border-anz-border
        shadow-card hover:shadow-card-hover
        hover:-translate-y-1
        transition-all duration-200 ease-out
        focus:outline-none focus:ring-2 focus:ring-anz-blue focus:ring-offset-2
      "
    >
      {/* Vivid gradient thumbnail — Adobe-style product colour identity */}
      <div
        className="relative h-44 overflow-hidden flex-shrink-0 flex items-end"
        style={{ background: imageUrl ? undefined : a.gradient }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <>
            {/* Abstract grid lines for depth */}
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
              backgroundSize: '32px 32px'
            }} />
            {/* App initial — large, white, upper right */}
            <span className="absolute top-4 right-5 text-6xl font-extrabold text-white tracking-tight select-none"
              style={{ opacity: 0.15, letterSpacing: '-0.04em' }}>
              {title.charAt(0)}
            </span>
            {/* Tag label bottom left */}
            <span className="relative z-10 m-4 text-xs font-semibold uppercase tracking-wider text-white/70">
              {tags?.[0] ?? 'AI'}
            </span>
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-base font-bold text-anz-navy leading-tight group-hover:text-anz-blue transition-colors duration-200">
            {title}
          </h3>
          <span
            className="text-xs font-semibold px-2.5 py-0.5 rounded-full flex-shrink-0 mt-0.5"
            style={{ color: a.badge, backgroundColor: a.badgeBg, border: `1px solid ${a.badgeBorder}` }}
          >
            Live
          </span>
        </div>

        <p className="text-sm text-anz-muted leading-relaxed mb-4 line-clamp-2 flex-1">
          {summary}
        </p>

        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-0.5 rounded-full bg-anz-surface text-anz-muted border border-anz-border"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1 text-xs text-anz-muted group-hover:text-anz-blue transition-colors duration-200 mt-auto">
          <span>View project</span>
          <svg
            className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200"
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </article>
  )
}
