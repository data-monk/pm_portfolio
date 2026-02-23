import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 glass border-b border-surface-border">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="text-neon-blue text-xl font-bold tracking-tight group-hover:opacity-80 transition-opacity">
            {'<'}
          </span>
          <span className="font-semibold tracking-tight text-white">
            AI PM Portfolio
          </span>
          <span className="text-neon-blue text-xl font-bold tracking-tight group-hover:opacity-80 transition-opacity">
            {'/>'}
          </span>
        </Link>

        <div className="flex items-center gap-6 text-sm text-slate-400">
          <a
            href="#projects"
            className="hover:text-neon-blue transition-colors duration-200"
          >
            Projects
          </a>
          <a
            href="#about"
            className="hover:text-neon-blue transition-colors duration-200"
          >
            About
          </a>
        </div>
      </div>
    </nav>
  )
}
