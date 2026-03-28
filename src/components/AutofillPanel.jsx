// components/AutofillPanel.jsx
// Shows real-time Tinyfish SSE events + handles the 2FA/SingPass handoff.

export function AutofillPanel({ state, onClose }) {
  const { card, events, status, streamingUrl, result, errorMsg } = state

  const isRunning = status === 'running'
  const isDone = status === 'done'
  const isError = status === 'error'

  // Detect if Tinyfish hit a wall
  const hitWall = events.some(e =>
    e.purpose?.toLowerCase().includes('singpass') ||
    e.purpose?.toLowerCase().includes('2fa') ||
    e.purpose?.toLowerCase().includes('otp') ||
    e.purpose?.toLowerCase().includes('login')
  ) || (isDone && result?.status === 'STOPPED')

  return (
    <div className="bg-white border border-cream-200 rounded-2xl overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-cream-200">
        <div className="flex items-center gap-2.5">
          {isRunning && (
            <span className="w-2 h-2 rounded-full bg-gold-400 animate-pulse-soft" />
          )}
          {isDone && !hitWall && (
            <span className="w-2 h-2 rounded-full bg-sage-500" />
          )}
          {(hitWall || isError) && (
            <span className="w-2 h-2 rounded-full bg-amber-400" />
          )}
          <span className="font-medium text-sm text-ink-900">
            {isRunning ? `Filling ${card}…` : hitWall ? 'Your turn to complete' : isDone ? 'Pre-filled!' : 'Error'}
          </span>
        </div>
        <button onClick={onClose} className="text-ink-300 hover:text-ink-700 transition-colors text-lg leading-none">×</button>
      </div>

      {/* Browser stream embed */}
      {streamingUrl && (
        <div className="px-5 pt-4">
          <p className="text-xs text-ink-400 mb-2 font-mono">Live browser</p>
          <div className="rounded-xl overflow-hidden border border-cream-200 bg-cream-50" style={{ height: '240px' }}>
            <iframe
              src={streamingUrl}
              className="w-full h-full"
              title="Tinyfish live browser"
              sandbox="allow-same-origin allow-scripts"
            />
          </div>
        </div>
      )}

      {/* SSE event log */}
      <div className="px-5 py-4">
        <p className="text-xs text-ink-400 mb-2 font-mono uppercase tracking-wide">Activity log</p>
        <div className="bg-cream-50 rounded-xl p-3 max-h-40 overflow-y-auto scrollbar-hide space-y-1 sse-log">
          {events.length === 0 && (
            <p className="text-ink-300">Starting…</p>
          )}
          {events.map((ev, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className={`text-xs font-mono flex-shrink-0
                ${ev.type === 'STARTED' ? 'text-ink-400' :
                  ev.type === 'PROGRESS' ? 'text-sage-600' :
                  ev.type === 'COMPLETE' ? 'text-gold-500' :
                  ev.type === 'STREAMING_URL' ? 'text-blue-400' :
                  'text-ink-300'}`}>
                [{ev.type}]
              </span>
              <span className="text-ink-500 text-xs">
                {ev.purpose || ev.status || ev.streaming_url?.slice(0, 40) || ''}
              </span>
            </div>
          ))}
          {isRunning && (
            <div className="flex items-center gap-1 text-ink-300">
              <span className="animate-pulse-soft">●</span>
              <span>Processing…</span>
            </div>
          )}
        </div>
      </div>

      {/* Handoff message */}
      {hitWall && (
        <div className="mx-5 mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="font-medium text-amber-800 text-sm mb-1">SingPass / 2FA step detected</p>
          <p className="text-amber-700 text-xs mb-3">
            Tinyfish has filled everything it can. You need to complete the SingPass login or OTP step yourself.
          </p>
          {state.url && (
            <a
              href={state.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-ink-900 text-cream-50 rounded-lg py-2.5 text-sm font-medium hover:bg-ink-700 transition-colors"
            >
              Continue on the form →
            </a>
          )}
        </div>
      )}

      {/* Success message */}
      {isDone && !hitWall && !isError && (
        <div className="mx-5 mb-5 bg-sage-400/10 border border-sage-400/20 rounded-xl p-4">
          <p className="font-medium text-sage-700 text-sm mb-1">Form pre-filled</p>
          <p className="text-sage-600 text-xs mb-3">
            Review all fields carefully before submitting. You are responsible for the final application.
          </p>
          {state.url && (
            <a
              href={state.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-sage-500 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-sage-600 transition-colors"
            >
              Review and submit →
            </a>
          )}
        </div>
      )}

      {/* Error message */}
      {isError && (
        <div className="mx-5 mb-5 bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="font-medium text-red-700 text-sm mb-1">Automation error</p>
          <p className="text-red-600 text-xs">{errorMsg || 'Unknown error. Please try again or apply manually.'}</p>
          {state.url && (
            <a
              href={state.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block w-full text-center border border-red-300 text-red-700 rounded-lg py-2.5 text-sm font-medium hover:bg-red-50 transition-colors"
            >
              Apply manually →
            </a>
          )}
        </div>
      )}
    </div>
  )
}
