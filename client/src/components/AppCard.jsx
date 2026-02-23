import { useNavigate } from 'react-router-dom'

export default function AppCard({ app }) {
  const navigate = useNavigate()
  const { title, summary, imageUrl, route, tags } = app

  return (
    <article
      onClick={() => navigate(route)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(route)}
      className="
        group relative overflow-hidden rounded-2xl cursor-pointer
        glass glow-border
        hover:border-neon-blue/40 hover:shadow-glow
        transition-all duration-300 ease-out
        hover:-translate-y-1
        focus:outline-none focus:ring-2 focus:ring-neon-blue/50
      "
    >
      {/* Thumbnail */}
      <div className="relative h-44 overflow-hidden bg-surface-border">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface-card to-surface-border">
            <div className="text-4xl font-black gradient-text opacity-40 select-none">
              {title.charAt(0)}
            </div>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-card via-transparent to-transparent opacity-60" />
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-neon-blue transition-colors duration-200">
          {title}
        </h3>
        <p className="text-sm text-slate-400 leading-relaxed mb-4 line-clamp-2">
          {summary}
        </p>

        {/* Tech stack tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-neon-blue/10 text-neon-blue border border-neon-blue/20"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Arrow hint */}
        <div className="mt-4 flex items-center gap-1 text-xs text-slate-600 group-hover:text-neon-blue transition-colors duration-200">
          <span>View project</span>
          <svg
            className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </article>
  )
}
