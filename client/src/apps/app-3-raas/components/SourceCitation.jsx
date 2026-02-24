export default function SourceCitation({ source, index }) {
  return (
    <div className="glass rounded-xl p-4 border border-surface-border">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-neon-blue uppercase tracking-wider mb-1">
            Source {index + 1}
          </p>
          <p className="text-white text-sm font-medium truncate">{source.docName}</p>
          <p className="text-slate-500 text-xs mt-0.5">Chunk #{source.chunkIndex}</p>
          {source.snippet && (
            <p className="text-slate-400 text-xs mt-2 line-clamp-3 leading-relaxed">
              {source.snippet}
            </p>
          )}
        </div>
        {source.score !== undefined && (
          <span className="flex-shrink-0 text-xs text-slate-500 font-mono">
            {(source.score * 100).toFixed(0)}%
          </span>
        )}
      </div>
      {source.webViewLink && (
        <a
          href={source.webViewLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-3 text-xs text-neon-blue hover:underline"
        >
          Open in Drive →
        </a>
      )}
    </div>
  )
}
