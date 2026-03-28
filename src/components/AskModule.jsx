// components/AskModule.jsx
// Free-form Q&A powered by Tinyfish — browses Singapore finance/gov sites live.
import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { askAdulting, extractResultText } from '../lib/tinyfish'
import { parseProfile } from '../lib/profile'
import { BrowserPanel } from './BrowserPanel'

const SUGGESTED = [
  "What's the best savings account for me right now?",
  "How do I file my income tax as a first-time employee?",
  "Should I invest in SSBs, T-bills, or a robo-advisor?",
  "What insurance do I actually need in my 20s?",
  "How much emergency savings should I have?",
  "How do I build my credit score in Singapore?",
  "What is my CPF contribution rate and how is it split?",
  "Is it worth getting a supplementary credit card?",
  "How do I check my CPF balance and what can I use it for?",
  "What are the best ways to save on groceries in Singapore?",
]

export function AskModule({ profileMd }) {
  const [question, setQuestion] = useState('')
  const [answers, setAnswers] = useState([])
  const [panel, setPanel] = useState(null)
  const [activeIdx, setActiveIdx] = useState(null)
  const textareaRef = useRef(null)

  const profile = parseProfile(profileMd)
  const firstName = profile.name ? profile.name.split(' ')[0] : 'you'

  // Auto-focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  function ask(q) {
    const trimmed = (q || question).trim()
    if (!trimmed) return
    setQuestion('')

    const idx = answers.length
    setActiveIdx(idx)
    setAnswers(prev => [...prev, { question: trimmed, text: '', loading: true }])
    setPanel({
      taskName: trimmed.length > 45 ? trimmed.slice(0, 45) + '…' : trimmed,
      streamingUrl: null,
      log: [],
      rawResult: null,
      status: 'running',
    })

    askAdulting({
      question: trimmed,
      profile,
      onEvent: (ev) => {
        if (ev.streaming_url) setPanel(p => p ? { ...p, streamingUrl: ev.streaming_url } : p)
        if (ev.type === 'PROGRESS' || ev.type === 'STARTED') {
          setPanel(p => p ? { ...p, log: [...(p.log || []), ev.purpose || ev.type] } : p)
        }
      },
      onDone: (ev) => {
        const text = extractResultText(ev.result) || extractResultText(ev)
        setAnswers(prev => prev.map((a, i) =>
          i === idx ? { ...a, text: text || '_No answer returned. Try rephrasing your question._', loading: false } : a
        ))
        setPanel(p => p ? { ...p, rawResult: ev, status: 'done' } : p)
      },
      onError: (msg) => {
        setAnswers(prev => prev.map((a, i) =>
          i === idx ? { ...a, text: `Error: ${msg}`, loading: false } : a
        ))
        setPanel(p => p ? { ...p, status: 'error', rawResult: msg } : p)
      },
    })
  }

  const isLoading = answers.some(a => a.loading)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="font-display text-2xl text-ink-900">Ask anything</h2>
        <p className="text-sm text-ink-500 mt-0.5">
          Tinyfish browses Singapore finance sites and answers with {firstName}'s profile in mind
        </p>
      </div>

      {/* Input */}
      <div className="bg-white border border-cream-200 rounded-2xl p-4 shadow-sm">
        <textarea
          ref={textareaRef}
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              if (!isLoading) ask()
            }
          }}
          placeholder={`Ask about savings, investments, insurance, CPF, tax… anything financial for ${firstName}.`}
          rows={3}
          className="w-full border border-cream-200 rounded-xl px-4 py-3 text-ink-900 bg-cream-50 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm resize-none"
        />
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-ink-300">Enter to ask · Shift+Enter for new line</p>
          <button
            onClick={() => ask()}
            disabled={!question.trim() || isLoading}
            className="flex items-center gap-2 bg-ink-900 text-cream-50 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-ink-700 transition-colors disabled:opacity-40"
          >
            {isLoading
              ? <><span className="animate-pulse-soft">●</span> Researching…</>
              : <><span>✦</span> Ask Tinyfish</>}
          </button>
        </div>
      </div>

      {/* Suggested questions — only when no answers yet */}
      {answers.length === 0 && (
        <div>
          <p className="text-xs text-ink-400 uppercase tracking-wide font-medium mb-3">Try asking</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED.map(q => (
              <button
                key={q}
                onClick={() => ask(q)}
                disabled={isLoading}
                className="text-xs bg-white border border-cream-200 text-ink-600 rounded-full px-3 py-1.5 hover:border-sage-400 hover:text-sage-700 transition-colors text-left disabled:opacity-40"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Answers — most recent first */}
      <div className="space-y-5">
        {[...answers].reverse().map((item, revIdx) => {
          const origIdx = answers.length - 1 - revIdx
          return (
            <div key={origIdx} className="bg-white border border-cream-200 rounded-2xl overflow-hidden shadow-sm">
              {/* Question row */}
              <div className="flex items-start gap-3 px-5 py-3.5 bg-cream-50 border-b border-cream-200">
                <span className="text-sage-500 text-sm mt-0.5 flex-shrink-0">✦</span>
                <p className="text-sm font-medium text-ink-900">{item.question}</p>
              </div>

              {/* Answer */}
              <div className="px-5 py-4">
                {item.loading ? (
                  <div className="space-y-2.5">
                    {[88, 72, 95, 65, 80, 60].map((w, j) => (
                      <div key={j} className="shimmer-bg h-3 rounded-md" style={{ width: `${w}%` }} />
                    ))}
                    <p className="text-xs text-ink-300 font-mono mt-3 flex items-center gap-1.5">
                      <span className="animate-pulse-soft">●</span>
                      Tinyfish is browsing the web for you…
                    </p>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none
                    prose-h2:font-display prose-h2:text-lg prose-h2:font-normal prose-h2:text-ink-900 prose-h2:mt-4 prose-h2:mb-2 first:prose-h2:mt-0
                    prose-h3:font-semibold prose-h3:text-ink-800 prose-h3:mt-3 prose-h3:mb-1
                    prose-strong:font-semibold prose-strong:text-ink-800
                    prose-p:text-ink-600 prose-p:leading-relaxed prose-p:my-1.5
                    prose-li:text-ink-600 prose-ul:my-1 prose-ul:space-y-0.5 prose-ol:my-1
                    prose-table:text-sm prose-th:text-ink-700 prose-th:font-semibold prose-td:text-ink-600
                    prose-a:text-sage-600 prose-a:no-underline hover:prose-a:underline
                    prose-em:text-ink-400">
                    <ReactMarkdown>{item.text}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Ask another if they have answers */}
      {answers.length > 0 && !isLoading && (
        <div className="text-center">
          <button
            onClick={() => textareaRef.current?.focus()}
            className="text-xs text-ink-400 hover:text-ink-700 transition-colors"
          >
            ↑ Ask another question
          </button>
        </div>
      )}

      {/* Live browser panel */}
      {panel && (
        <BrowserPanel
          taskName={panel.taskName}
          streamingUrl={panel.streamingUrl}
          log={panel.log}
          rawResult={panel.rawResult}
          status={panel.status}
          onClose={() => setPanel(null)}
        />
      )}
    </div>
  )
}
