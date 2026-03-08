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
          <a
            href="https://www.linkedin.com/in/prasun-anand/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neon-blue/30 text-neon-blue hover:bg-neon-blue/10 transition-colors duration-200 text-xs font-semibold"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            LinkedIn
          </a>
        </div>
      </div>
    </nav>
  )
}
