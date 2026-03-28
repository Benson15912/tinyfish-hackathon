// components/BTOModule.jsx
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { runAutomationSSE, buildBTOAutofillTask, getBTOGuidance, getGrantEligibility, extractResultText } from '../lib/tinyfish'
import { parseProfile } from '../lib/profile'
import { AutofillPanel } from './AutofillPanel'
import { BrowserPanel } from './BrowserPanel'

const BTO_STEPS = [
  { id: 'hfe', label: 'Get HFE letter', desc: 'Apply at HDB website first', url: 'https://www.hdb.gov.sg/residential/buying-a-flat/finding-a-flat/housing-loan/flat-eligibility' },
  { id: 'ballot', label: 'Submit ballot', desc: 'During launch window', url: 'https://www.hdb.gov.sg/residential/buying-a-flat/finding-a-flat/new-flats/bto-and-sleb' },
  { id: 'select', label: 'Flat selection', desc: 'Based on queue number', url: null },
  { id: 'lease', label: 'Sign lease', desc: 'Agreement for Lease + downpayment', url: null },
  { id: 'wait', label: 'Wait 3–5 years', desc: 'Flat construction period', url: null },
  { id: 'keys', label: 'Key collection', desc: 'Move in!', url: null },
]

export function BTOModule({ profileMd }) {
  const [guidance, setGuidance] = useState('')
  const [loading, setLoading] = useState(false)
  const [grants, setGrants] = useState('')
  const [grantsLoading, setGrantsLoading] = useState(false)
  const [panel, setPanel] = useState(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [autofillState, setAutofillState] = useState(null)

  const profile = parseProfile(profileMd)

  function loadGuidance() {
    setLoading(true)
    setGuidance('')
    setPanel({ taskName: 'BTO guidance — HDB research', streamingUrl: null, log: [], rawResult: null, status: 'running' })

    getBTOGuidance({
      profile,
      onEvent: (ev) => {
        if (ev.streaming_url) setPanel(p => p ? { ...p, streamingUrl: ev.streaming_url } : p)
        if (ev.type === 'PROGRESS' || ev.type === 'STARTED') {
          setPanel(p => p ? { ...p, log: [...p.log, ev.purpose || ev.type] } : p)
        }
      },
      onDone: (ev) => {
        const text = extractResultText(ev.result) || extractResultText(ev)
        setGuidance(text || '_No result returned. Open "Raw result" in the panel on the right to see what Tinyfish returned._')
        setPanel(p => p ? { ...p, rawResult: ev, status: 'done' } : p)
        setLoading(false)
      },
      onError: (msg) => {
        setGuidance(`Error: ${msg}`)
        setPanel(p => p ? { ...p, status: 'error', rawResult: msg } : p)
        setLoading(false)
      },
    })
  }

  function loadGrants() {
    setGrantsLoading(true)
    setGrants('')
    setPanel({ taskName: 'Grant eligibility — HDB & CPF research', streamingUrl: null, log: [], rawResult: null, status: 'running' })

    getGrantEligibility({
      profile,
      onEvent: (ev) => {
        if (ev.streaming_url) setPanel(p => p ? { ...p, streamingUrl: ev.streaming_url } : p)
        if (ev.type === 'PROGRESS' || ev.type === 'STARTED') {
          setPanel(p => p ? { ...p, log: [...p.log, ev.purpose || ev.type] } : p)
        }
      },
      onDone: (ev) => {
        const text = extractResultText(ev.result) || extractResultText(ev)
        setGrants(text || '_No result returned. Check the agent output panel._')
        setPanel(p => p ? { ...p, rawResult: ev, status: 'done' } : p)
        setGrantsLoading(false)
      },
      onError: (msg) => {
        setGrants(`Error: ${msg}`)
        setPanel(p => p ? { ...p, status: 'error', rawResult: msg } : p)
        setGrantsLoading(false)
      },
    })
  }

  function startAutofill(step) {
    if (!step.url) return
    const consented = profile.autofill_consented === 'true'
    if (!consented) {
      if (!window.confirm(
        'Adulting SG will use your profile to fill this HDB form automatically.\n\n' +
        'Your data stays on your device. You will review everything before submitting.\n\n' +
        'Continue?'
      )) return
    }

    const task = buildBTOAutofillTask(profile, step.url)
    const events = []

    setAutofillState({ url: step.url, card: step.label, events: [], status: 'running', streamingUrl: null })

    const ctrl = runAutomationSSE({
      url: step.url,
      goal: task,
      onEvent: (ev) => {
        events.push(ev)
        setAutofillState(s => ({
          ...s,
          events: [...events],
          streamingUrl: ev.streaming_url || s?.streamingUrl,
          status: ev.type === 'COMPLETE' ? 'done' : 'running',
          result: ev.result || s?.result,
        }))
      },
      onDone: (ev) => setAutofillState(s => ({ ...s, status: 'done', result: ev.result })),
      onError: (msg) => setAutofillState(s => ({ ...s, status: 'error', errorMsg: msg })),
    })
    setAutofillState(s => ({ ...s, _ctrl: ctrl }))
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="font-display text-2xl text-ink-900">BTO journey</h2>
        <p className="text-sm text-ink-500 mt-0.5">Your personalised HDB roadmap — powered by live research</p>
      </div>

      {/* Grant eligibility — prominent Tinyfish feature */}
      <div className="bg-ink-900 text-cream-50 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-xs text-cream-200/50 uppercase tracking-widest font-mono mb-0.5">Tinyfish research</p>
            <h3 className="font-display text-xl text-cream-50">What grants am I eligible for?</h3>
            <p className="text-xs text-cream-200/60 mt-1">
              Tinyfish browses HDB and CPF websites and calculates your exact grant entitlement
            </p>
          </div>
          <button
            onClick={loadGrants}
            disabled={grantsLoading}
            className="flex items-center gap-2 bg-cream-50 text-ink-900 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-cream-200 transition-colors disabled:opacity-50 whitespace-nowrap flex-shrink-0"
          >
            {grantsLoading
              ? <><span className="animate-pulse-soft">●</span> Checking…</>
              : <><span>✦</span> Check my grants</>}
          </button>
        </div>

        {!grants && !grantsLoading && (
          <p className="text-cream-200/40 text-sm">
            Find out exactly which HDB grants you qualify for — EHG, CPF Housing Grant, PHG — and how much you can get.
          </p>
        )}

        {grantsLoading && !grants && (
          <div className="space-y-2 mt-2">
            {[80, 65, 90, 55, 75].map((w, i) => (
              <div key={i} className="shimmer-bg h-3 rounded-md opacity-20" style={{ width: `${w}%` }} />
            ))}
          </div>
        )}

        {grants && (
          <div className="prose prose-sm max-w-none
            prose-headings:text-cream-50 prose-headings:font-display prose-headings:font-normal prose-headings:text-lg prose-headings:mt-4 prose-headings:mb-2 first:prose-headings:mt-0
            prose-strong:text-cream-100 prose-strong:font-semibold
            prose-p:text-cream-200/80 prose-p:leading-relaxed prose-p:my-1
            prose-li:text-cream-200/70 prose-ul:my-1
            prose-table:text-sm prose-th:text-cream-200 prose-th:font-semibold prose-td:text-cream-200/70
            prose-em:text-cream-200/50">
            <ReactMarkdown>{grants}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* Progress tracker */}
      <div className="bg-white border border-cream-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-ink-400 uppercase tracking-wide font-medium">Your progress</p>
          <button
            onClick={loadGuidance}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs bg-cream-100 hover:bg-ink-900 hover:text-cream-50 text-ink-600 rounded-lg px-3 py-1.5 font-medium transition-colors disabled:opacity-50"
          >
            {loading
              ? <><span className="animate-pulse-soft">●</span> Analysing…</>
              : <><span>✦</span> Get guidance</>}
          </button>
        </div>
        <div className="space-y-1">
          {BTO_STEPS.map((step, i) => {
            const done = i < currentStep
            const active = i === currentStep
            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors
                  ${active ? 'bg-sage-400/10 border border-sage-400/20' : 'hover:bg-cream-50'}`}
                onClick={() => setCurrentStep(i)}
              >
                {/* Status dot */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono flex-shrink-0
                  ${done ? 'bg-sage-500 text-white' : active ? 'bg-cream-200 text-ink-700 border-2 border-sage-500' : 'bg-cream-200 text-ink-400'}`}>
                  {done ? '✓' : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${done ? 'text-ink-400 line-through' : 'text-ink-900'}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-ink-400">{step.desc}</p>
                </div>
                {step.url && active && (
                  <button
                    onClick={(e) => { e.stopPropagation(); startAutofill(step) }}
                    className="text-xs bg-ink-900 text-cream-50 rounded-lg px-2.5 py-1.5 font-medium hover:bg-ink-700 transition-colors whitespace-nowrap"
                  >
                    Auto-fill →
                  </button>
                )}
                {!step.url && active && (
                  <span className="text-xs text-ink-300 whitespace-nowrap">Manual step</span>
                )}
                {done && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setCurrentStep(i) }}
                    className="text-xs text-ink-300 hover:text-ink-600 transition-colors"
                  >
                    Undo
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {currentStep > 0 && currentStep < BTO_STEPS.length && (
          <button
            onClick={() => setCurrentStep(s => s + 1)}
            className="mt-4 w-full text-xs border border-sage-400/30 text-sage-600 rounded-xl py-2.5 font-medium hover:bg-sage-400/10 transition-colors"
          >
            Mark "{BTO_STEPS[currentStep].label}" as done →
          </button>
        )}
      </div>

      {/* Guidance output */}
      {(guidance || loading) && (
        <div className="bg-white border border-cream-200 rounded-2xl p-6">
          {loading && !guidance && (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="shimmer-bg h-4 rounded-lg" style={{ width: `${90 - i * 8}%` }} />
              ))}
            </div>
          )}
          {guidance && (
            <div className="prose prose-sm max-w-none text-ink-900
              prose-h2:font-display prose-h2:text-lg prose-h2:font-normal prose-h2:text-ink-900
              prose-strong:font-medium prose-strong:text-ink-700
              prose-p:text-ink-600 prose-p:leading-relaxed
              prose-li:text-ink-600 prose-em:text-ink-400">
              <ReactMarkdown>{guidance}</ReactMarkdown>
            </div>
          )}
        </div>
      )}

      {/* Autofill panel */}
      {autofillState && (
        <AutofillPanel
          state={autofillState}
          onClose={() => setAutofillState(null)}
        />
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
