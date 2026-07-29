export default function Footer() {
  return (
    <footer className="border-t border-anz-border bg-anz-surface">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-anz-muted">
        <p>
          Built with{' '}
          <span className="text-anz-blue font-medium">React</span>,{' '}
          <span className="text-anz-blue font-medium">Tailwind</span> &amp;{' '}
          <span className="text-anz-blue font-medium">Node.js</span>
        </p>
        <p>© {new Date().getFullYear()} Prasun Anand</p>
      </div>
    </footer>
  )
}
