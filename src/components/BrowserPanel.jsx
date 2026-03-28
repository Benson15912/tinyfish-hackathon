// components/BrowserPanel.jsx
import { useState, useRef, useEffect } from 'react'

export function BrowserPanel({ taskName, streamingUrl, log, rawResult, status, onClose }) {
  const [minimized, setMinimized] = useState(false)
  const [showRaw, setShowRaw] = useState(false)
  const logRef = useRef(null)

  const isRunning = status === 'running'
  const isDone = status === 'done'
  const isError = status === 'error'

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [log])

  const statusIcon = isRunning
    ? <span className="text-amber-400 text-xs animate-pulse">✦</span>
    : isDone
    ? <span className="text-sage-400 text-xs">✓</span>
    : <span className="text-red-400 text-xs">✗</span>

  const statusBg = isRunning
    ? 'rgba(251,191,36,0.15)'
    : isDone
    ? 'rgba(100,160,90,0.15)'
    : 'rgba(220,80,80,0.15)'

  // ── Minimised pill ───────────────────────────────────────────────────────
  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-ink-900 text-cream-50 rounded-2xl px-4 py-3 shadow-2xl border border-ink-700 cursor-pointer hover:bg-ink-800 transition-colors select-none"
        onClick={() => setMinimized(false)}
      >
        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: statusBg }}>
          {statusIcon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-cream-200/40 font-mono uppercase tracking-wider leading-none mb-0.5">Tinyfish</p>
          <p className="text-sm font-medium text-cream-50 truncate max-w-[160px] leading-tight">{taskName}</p>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onClose() }}
          className="ml-1 text-cream-200/30 hover:text-cream-50 transition-colors w-5 h-5 flex items-center justify-center rounded hover:bg-ink-700 text-base leading-none flex-shrink-0"
          title="Dismiss"
        >×</button>
      </div>
    )
  }

  // ── Full floating panel ──────────────────────────────────────────────────
  return (
    <div className="fixed bottom-4 right-4 z-50 w-[380px] rounded-2xl bg-white border border-cream-200 shadow-2xl flex flex-col overflow-hidden"
      style={{ maxHeight: 'calc(100vh - 2rem)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-ink-900 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: statusBg }}>
            {statusIcon}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-cream-200/40 font-mono uppercase tracking-wider leading-none mb-0.5">Tinyfish Agent</p>
            <p className="text-sm font-medium text-cream-50 truncate leading-tight">{taskName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          <button
            onClick={() => setMinimized(true)}
            className="text-cream-200/40 hover:text-cream-50 transition-colors w-7 h-7 flex items-center justify-center rounded hover:bg-ink-700 text-base"
            title="Minimise"
          >−</button>
          <button
            onClick={onClose}
            className="text-cream-200/40 hover:text-cream-50 transition-colors w-7 h-7 flex items-center justify-center rounded hover:bg-ink-700 text-xl leading-none"
            title="Dismiss"
          >×</button>
        </div>
      </div>

      {/* Live iframe */}
      <div className="flex-shrink-0 border-b border-cream-200" style={{ height: '220px', background: '#f8f6f0' }}>
        {streamingUrl ? (
          <iframe src={streamingUrl} className="w-full h-full" title="Tinyfish live browser"
            sandbox="allow-same-origin allow-scripts" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 border-2 border-cream-200 border-t-ink-400 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-ink-300 text-xs">✦</span>
              </div>
            </div>
            <p className="text-xs text-ink-400 font-medium">Starting browser…</p>
          </div>
        )}
      </div>

      {/* Activity log */}
      <div className="flex flex-col px-4 py-3 min-h-0" style={{ maxHeight: '160px' }}>
        <p className="text-[10px] text-ink-400 uppercase tracking-widest font-mono mb-1.5 flex-shrink-0">Activity</p>
        <div ref={logRef} className="overflow-y-auto space-y-0.5 flex-1">
          {log.length === 0 && <p className="text-xs text-ink-300 font-mono italic">Initialising…</p>}
          {log.map((msg, i) => (
            <p key={i} className="text-xs font-mono text-ink-500 leading-relaxed">
              <span className="text-ink-300 select-none mr-1">›</span>{msg}
            </p>
          ))}
          {isRunning && <p className="text-xs font-mono text-amber-500 animate-pulse">● Browsing…</p>}
          {isDone    && <p className="text-xs font-mono text-sage-600">✓ Done</p>}
          {isError   && <p className="text-xs font-mono text-red-500">✗ Failed</p>}
        </div>
      </div>

      {/* Agent output toggle */}
      <div className="flex-shrink-0 border-t border-cream-200 px-4 py-2.5">
        <button onClick={() => setShowRaw(r => !r)}
          className="flex items-center justify-between w-full text-xs text-ink-400 hover:text-ink-700 transition-colors">
          <span className="font-mono uppercase tracking-widest">Agent output</span>
          <span>{showRaw ? '▲' : '▼'}</span>
        </button>
        {showRaw && (
          <pre className="mt-2 bg-cream-50 rounded-lg p-2.5 text-xs font-mono text-ink-500 overflow-auto max-h-36 whitespace-pre-wrap break-all border border-cream-200">
            {rawResult ? (typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult, null, 2)) : 'No result yet'}
          </pre>
        )}
      </div>
    </div>
  )
}
