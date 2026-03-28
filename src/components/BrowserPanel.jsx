// components/BrowserPanel.jsx
// Fixed right-side panel — shows Tinyfish's live browser, activity log, and agent output.
import { useState, useRef, useEffect } from 'react'

export function BrowserPanel({ taskName, streamingUrl, log, rawResult, status, onClose }) {
  const [showRaw, setShowRaw] = useState(false)
  const logRef = useRef(null)

  const isRunning = status === 'running'
  const isDone = status === 'done'
  const isError = status === 'error'

  // Auto-scroll log to bottom as new entries arrive
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [log])

  return (
    <div className="fixed top-0 right-0 h-screen w-[420px] bg-white border-l border-cream-200 shadow-2xl z-50 flex flex-col">

      {/* Header — dark branded */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ink-700 flex-shrink-0 bg-ink-900">
        <div className="flex items-center gap-3 min-w-0">
          {/* Status icon */}
          <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: isRunning ? 'rgba(250,189,0,0.15)' : isDone ? 'rgba(100,160,90,0.15)' : 'rgba(220,80,80,0.15)' }}>
            {isRunning && <span className="text-gold-400 text-sm animate-pulse-soft">✦</span>}
            {isDone && <span className="text-sage-400 text-sm">✓</span>}
            {isError && <span className="text-red-400 text-sm">✗</span>}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-cream-200/40 font-mono uppercase tracking-widest">Tinyfish Agent</p>
            <p className="text-sm font-medium text-cream-50 truncate leading-tight">{taskName}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-cream-200/40 hover:text-cream-50 transition-colors text-xl leading-none flex-shrink-0 ml-2 w-7 h-7 flex items-center justify-center rounded hover:bg-ink-700"
        >
          ×
        </button>
      </div>

      {/* Live browser iframe */}
      <div className="flex-shrink-0 border-b border-cream-200" style={{ height: '280px', background: '#f8f6f0' }}>
        {streamingUrl ? (
          <iframe
            src={streamingUrl}
            className="w-full h-full"
            title="Tinyfish live browser"
            sandbox="allow-same-origin allow-scripts"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <div className="relative w-9 h-9">
              <div className="absolute inset-0 border-2 border-cream-200 border-t-ink-400 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-ink-300 text-xs">✦</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs text-ink-400 font-medium">Starting browser…</p>
              <p className="text-xs text-ink-300 font-mono mt-0.5">stream will appear shortly</p>
            </div>
          </div>
        )}
      </div>

      {/* Activity log */}
      <div className="flex-1 overflow-hidden flex flex-col px-4 py-3 min-h-0">
        <p className="text-xs text-ink-400 uppercase tracking-widest font-mono mb-2 flex-shrink-0">Activity</p>
        <div ref={logRef} className="flex-1 overflow-y-auto space-y-1 min-h-0 pr-1">
          {log.length === 0 && (
            <p className="text-xs text-ink-300 font-mono italic">Initialising…</p>
          )}
          {log.map((msg, i) => (
            <p key={i} className="text-xs font-mono text-ink-500 leading-relaxed">
              <span className="text-ink-300 select-none mr-1">›</span>{msg}
            </p>
          ))}
          {isRunning && (
            <p className="text-xs font-mono text-gold-500 animate-pulse-soft">● Browsing…</p>
          )}
          {isDone && (
            <p className="text-xs font-mono text-sage-600">✓ Research complete</p>
          )}
          {isError && (
            <p className="text-xs font-mono text-red-500">✗ Task failed — see agent output below</p>
          )}
        </div>
      </div>

      {/* Agent output (collapsible) */}
      <div className="flex-shrink-0 border-t border-cream-200 px-4 py-3">
        <button
          onClick={() => setShowRaw(r => !r)}
          className="flex items-center justify-between w-full text-xs text-ink-400 hover:text-ink-700 transition-colors group"
        >
          <span className="font-mono uppercase tracking-widest group-hover:text-ink-700">Agent output</span>
          <span className="text-ink-300">{showRaw ? '▲' : '▼'}</span>
        </button>
        {showRaw && (
          <pre className="mt-2 bg-cream-50 rounded-lg p-3 text-xs font-mono text-ink-500 overflow-auto max-h-44 whitespace-pre-wrap break-all border border-cream-200">
            {rawResult
              ? (typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult, null, 2))
              : 'No result yet'}
          </pre>
        )}
      </div>
    </div>
  )
}
