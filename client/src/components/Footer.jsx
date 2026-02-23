export default function Footer() {
  return (
    <footer className="border-t border-surface-border mt-24">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
        <p>
          Built with{' '}
          <span className="text-neon-blue">React</span>,{' '}
          <span className="text-neon-purple">Tailwind</span> &amp;{' '}
          <span className="text-neon-silver">Node.js</span>
        </p>
        <p>© {new Date().getFullYear()} AI PM Portfolio. All rights reserved.</p>
      </div>
    </footer>
  )
}
