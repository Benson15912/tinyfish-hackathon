// components/CardModule.jsx
import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { runAutomationSSE, buildCardAutofillTask, personaliseCardList, extractResultText } from '../lib/tinyfish'
import { getCardVerdictAI, compareCardsAI } from '../lib/openai'
import { findCardInDatabase, generateFallbackBreakdown } from '../lib/cardDatabase'
import { parseProfile } from '../lib/profile'
import { AutofillPanel } from './AutofillPanel'
import { BrowserPanel } from './BrowserPanel'

export function CardModule({ profileMd, apiKey }) {
  const [panel, setPanel] = useState(null)

  // Verdict (Tinyfish)
  const [verdict, setVerdict] = useState('')
  const [verdictLoading, setVerdictLoading] = useState(false)

  // Comparison (Tinyfish)
  const [comparison, setComparison] = useState('')
  const [comparisonLoading, setComparisonLoading] = useState(false)

  // Personalised card list (Tinyfish) — cached in localStorage
  const CARDS_CACHE_KEY = 'adulting_sg_personalised_cards'
  const [displayCards, setDisplayCards] = useState(() => {
    try {
      const cached = localStorage.getItem(CARDS_CACHE_KEY)
      if (cached) return JSON.parse(cached)
    } catch {}
    return []
  })
  const [cardsPersonalised, setCardsPersonalised] = useState(
    () => !!localStorage.getItem(CARDS_CACHE_KEY)
  )
  const [cardsLoading, setCardsLoading] = useState(false)

  // Per-card breakdowns — cached in localStorage
  // Stored as { [cardName]: { pros: string[], cons: string[], verdict: string } }
  const BREAKDOWNS_CACHE_KEY = 'adulting_sg_card_breakdowns_v2'
  const [breakdowns, setBreakdowns] = useState(() => {
    try {
      const cached = localStorage.getItem(BREAKDOWNS_CACHE_KEY)
      if (cached) return JSON.parse(cached)
    } catch {}
    return {}
  })
  const [breakdownLoading, setBreakdownLoading] = useState({}) // { [cardName]: bool }
  const [expanded, setExpanded] = useState({})               // { [cardName]: bool }

  const [autofillState, setAutofillState] = useState(null)
  const profile = parseProfile(profileMd)

  // Auto-generate card list on first visit (no cache)
  useEffect(() => {
    if (!profile.income_monthly) return
    if (localStorage.getItem(CARDS_CACHE_KEY)) return
    refreshCardList()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Tinyfish: card list ─────────────────────────────────────────────────

  function refreshCardList() {
    localStorage.removeItem(CARDS_CACHE_KEY)
    localStorage.removeItem(BREAKDOWNS_CACHE_KEY)
    setBreakdowns({})
    setExpanded({})
    setVerdict('')
    setComparison('')
    setCardsLoading(true)
    openPanel('Personalising your card list…')

    personaliseCardList({
      profile,
      onEvent: (ev) => {
        if (ev.streaming_url) updatePanel({ streamingUrl: ev.streaming_url })
        if (ev.type === 'PROGRESS' || ev.type === 'STARTED') appendLog(ev.purpose || ev.type)
      },
      onDone: (ev) => {
        updatePanel({ rawResult: ev, status: 'done' })
        try {
          const raw = typeof ev.result === 'string' ? ev.result : JSON.stringify(ev.result)
          const match = raw.match(/\[[\s\S]*\]/)
          const parsed = JSON.parse(match ? match[0] : raw)
          if (Array.isArray(parsed) && parsed.length > 0) {
            const cards = parsed.map(c => ({ ...c, url: c.url || '#' }))
            setDisplayCards(cards)
            setCardsPersonalised(true)
            localStorage.setItem(CARDS_CACHE_KEY, JSON.stringify(cards))
          }
        } catch {}
        setCardsLoading(false)
      },
      onError: () => {
        updatePanel({ status: 'error' })
        setCardsLoading(false)
      },
    })
  }

  // ─── Tinyfish: verdict ───────────────────────────────────────────────────

  function loadVerdict() {
    if (!apiKey) return
    if (!displayCards.length) return
    setVerdictLoading(true)
    setVerdict('')

    getCardVerdictAI({
      cards: displayCards,
      profile,
      apiKey,
      onChunk: (_, full) => setVerdict(full),
      onDone: (full) => { setVerdict(full); setVerdictLoading(false) },
      onError: (msg) => { setVerdict(`Error: ${msg}`); setVerdictLoading(false) },
    })
  }

  // ─── Tinyfish: comparison ────────────────────────────────────────────────

  function loadComparison() {
    if (!apiKey) return
    if (!displayCards.length) return
    setComparisonLoading(true)
    setComparison('')

    compareCardsAI({
      cards: displayCards,
      profile,
      apiKey,
      onChunk: (_, full) => setComparison(full),
      onDone: (full) => { setComparison(full); setComparisonLoading(false) },
      onError: (msg) => { setComparison(`Error: ${msg}`); setComparisonLoading(false) },
    })
  }

  // ─── Per-card breakdown (database → Tinyfish fallback) ──────────────────

  function toggleBreakdown(card) {
    // Toggle if already loaded
    if (breakdowns[card.name]) {
      setExpanded(e => ({ ...e, [card.name]: !e[card.name] }))
      return
    }

    setExpanded(e => ({ ...e, [card.name]: true }))

    // 1. Check hardcoded database first — instant, no API call
    const dbCard = findCardInDatabase(card.name)
    if (dbCard) {
      const data = { pros: dbCard.pros, cons: dbCard.cons, verdict: dbCard.verdict }
      setBreakdowns(b => {
        const updated = { ...b, [card.name]: data }
        try { localStorage.setItem(BREAKDOWNS_CACHE_KEY, JSON.stringify(updated)) } catch {}
        return updated
      })
      return
    }

    // 2. Card not in database — generate from tag instantly, no API call
    const fallback = generateFallbackBreakdown(card)
    setBreakdowns(b => {
      const updated = { ...b, [card.name]: fallback }
      try { localStorage.setItem(BREAKDOWNS_CACHE_KEY, JSON.stringify(updated)) } catch {}
      return updated
    })
  }

  // ─── Tinyfish: autofill ──────────────────────────────────────────────────

  function startAutofill(card) {
    const consented = profile.autofill_consented === 'true'
    if (!consented) {
      if (!window.confirm(
        'Adulting SG will use your profile to fill this form automatically.\n\n' +
        'Your data stays on your device. You will review the form before submitting.\n\n' +
        'Continue?'
      )) return
    }

    const task = buildCardAutofillTask(profile, card.url)
    const events = []
    setAutofillState({ url: card.url, card: card.name, events: [], status: 'running', streamingUrl: null })

    const ctrl = runAutomationSSE({
      url: card.url,
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

  // ─── Panel helpers ────────────────────────────────────────────────────────

  function openPanel(taskName) {
    setPanel({ taskName, streamingUrl: null, log: [], rawResult: null, status: 'running' })
  }
  function updatePanel(patch) {
    setPanel(p => p ? { ...p, ...patch } : p)
  }
  function appendLog(msg) {
    if (!msg) return
    setPanel(p => p ? { ...p, log: [...p.log, msg] } : p)
  }

  // ─── No API key banner ────────────────────────────────────────────────────

  const noKeyBanner = null

  // ─── Prose class reuse ────────────────────────────────────────────────────

  const darkProse = `prose prose-sm max-w-none
    prose-headings:text-cream-50 prose-headings:font-display prose-headings:font-normal prose-headings:text-lg prose-headings:mt-4 prose-headings:mb-2 first:prose-headings:mt-0
    prose-strong:text-cream-100 prose-strong:font-semibold
    prose-p:text-cream-200/80 prose-p:leading-relaxed prose-p:my-1
    prose-li:text-cream-200/70 prose-ul:my-1 prose-ul:space-y-0.5
    prose-em:text-cream-200/50`

  const lightProse = `prose prose-sm max-w-none
    prose-h2:font-display prose-h2:text-lg prose-h2:font-normal prose-h2:text-ink-900 prose-h2:mt-4 prose-h2:mb-2 first:prose-h2:mt-0
    prose-strong:font-semibold prose-strong:text-ink-800
    prose-p:text-ink-600 prose-p:leading-relaxed prose-p:my-1
    prose-li:text-ink-600 prose-ul:my-1 prose-ul:space-y-0.5
    prose-em:text-ink-400`

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="font-display text-2xl text-ink-900">Credit cards</h2>
        <p className="text-sm text-ink-500 mt-0.5">
          Tinyfish finds and reasons about the best cards for you
        </p>
      </div>

      {noKeyBanner}

      {/* ── Verdict ──────────────────────────────────────────────────────── */}
      <div className="bg-ink-900 text-cream-50 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-xs text-cream-200/50 uppercase tracking-widest font-mono mb-0.5">Tinyfish reasoning</p>
            <h3 className="font-display text-xl text-cream-50">Which card should I get?</h3>
            <p className="text-xs text-cream-200/60 mt-1">
              Tinyfish checks current offers and picks the single best card for your profile
            </p>
          </div>
          <button
            onClick={loadVerdict}
            disabled={verdictLoading || !displayCards.length}
            title={!displayCards.length ? 'Generate your card list first' : ''}
            className="flex items-center gap-2 bg-cream-50 text-ink-900 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-cream-200 transition-colors disabled:opacity-50 whitespace-nowrap flex-shrink-0"
          >
            {verdictLoading
              ? <><span className="animate-pulse-soft">●</span> Thinking…</>
              : <><span>✦</span> Get my verdict</>}
          </button>
        </div>

        {!verdict && !verdictLoading && (
          <p className="text-cream-200/40 text-sm">
            {displayCards.length
              ? `${displayCards.length} cards shortlisted for you — press "Get my verdict" for a decisive pick.`
              : 'Generate your personalised card list first, then get a verdict.'}
          </p>
        )}
        {verdictLoading && !verdict && (
          <div className="space-y-2">
            {[80, 65, 90, 55, 75].map((w, i) => (
              <div key={i} className="shimmer-bg h-3 rounded-md opacity-20" style={{ width: `${w}%` }} />
            ))}
          </div>
        )}
        {verdict && <div className={darkProse}><ReactMarkdown>{verdict}</ReactMarkdown></div>}
      </div>

      {/* ── Compare all cards ────────────────────────────────────────────── */}
      <div className="bg-white border border-cream-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-ink-400 uppercase tracking-widest font-mono mb-0.5">Tinyfish reasoning</p>
            <h3 className="font-display text-xl text-ink-900">Full ranking — all cards</h3>
          </div>
          <button
            onClick={loadComparison}
            disabled={comparisonLoading || !displayCards.length}
            className="flex items-center gap-2 bg-ink-900 text-cream-50 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-ink-700 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {comparisonLoading
              ? <><span className="animate-pulse-soft">●</span> Ranking…</>
              : <><span>✦</span> Rank all cards</>}
          </button>
        </div>

        {comparison
          ? <div className={lightProse}><ReactMarkdown>{comparison}</ReactMarkdown></div>
          : !comparisonLoading && (
            <p className="text-ink-400 text-sm">
              Tinyfish will rank all {displayCards.length || '?'} cards from best to worst for your specific spending profile.
            </p>
          )}
        {comparisonLoading && !comparison && (
          <div className="space-y-2">
            {[85, 70, 90, 60, 80].map((w, i) => (
              <div key={i} className="shimmer-bg h-4 rounded-md" style={{ width: `${w}%` }} />
            ))}
          </div>
        )}
      </div>

      {/* ── Personalised card list (Tinyfish) ──────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <p className="text-xs text-ink-400 uppercase tracking-widest font-mono">Your cards</p>
            {cardsPersonalised && (
              <span className="text-xs bg-sage-400/10 text-sage-600 rounded-full px-2 py-0.5 font-medium">✦ Personalised</span>
            )}
            {cardsLoading && (
              <span className="text-xs text-ink-300 font-mono animate-pulse-soft">Personalising…</span>
            )}
          </div>
          <button
            onClick={refreshCardList}
            disabled={cardsLoading}
            className="text-xs text-ink-300 hover:text-ink-600 transition-colors disabled:opacity-40"
            title="Re-run Tinyfish to refresh card picks"
          >
            ⟳ Refresh
          </button>
        </div>

        {displayCards.length === 0 && !cardsLoading && (
          <div className="bg-cream-50 border border-cream-200 rounded-xl px-4 py-6 text-center">
            <p className="text-sm text-ink-500 mb-3">
              Tinyfish will browse the web and find the best cards for your income and spending profile.
            </p>
            <button
              onClick={refreshCardList}
              className="text-xs bg-ink-900 text-cream-50 rounded-lg px-4 py-2 font-medium hover:bg-ink-700 transition-colors"
            >
              ✦ Generate my card list
            </button>
          </div>
        )}

        <div className="space-y-2">
          {displayCards.map(card => {
            const bd = breakdowns[card.name]
            const isOpen = !!expanded[card.name]
            const isLoading = !!breakdownLoading[card.name]

            return (
              <div
                key={card.name}
                className="bg-white border border-cream-200 rounded-xl overflow-hidden hover:border-sage-300 transition-colors"
              >
                {/* Card row */}
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink-900 text-sm leading-tight">{card.name}</p>
                    <p className="text-xs text-ink-400">{card.bank}</p>
                  </div>
                  <span className="text-xs bg-sage-400/10 text-sage-600 rounded-full px-2 py-0.5 font-medium whitespace-nowrap flex-shrink-0">
                    {card.tag}
                  </span>
                  {/* Breakdown toggle */}
                  <button
                    onClick={() => toggleBreakdown(card)}
                    disabled={isLoading}
                    className={`flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 font-medium transition-colors flex-shrink-0 disabled:opacity-50
                      ${isOpen
                        ? 'bg-ink-900 text-cream-50 hover:bg-ink-700'
                        : 'bg-cream-100 text-ink-500 hover:bg-ink-900 hover:text-cream-50'}`}
                  >
                    {isLoading
                      ? <span className="animate-pulse-soft">●</span>
                      : isOpen ? '▲' : '▼'}
                    {!isLoading && <span>{isOpen ? 'Hide' : 'Pros/Cons'}</span>}
                  </button>
                </div>

                {/* Pros / Cons dropdown */}
                {isOpen && (
                  <div className="border-t border-cream-100 px-4 py-4">
                    {isLoading ? (
                      <div className="space-y-2">
                        {[70, 85, 60, 75].map((w, i) => (
                          <div key={i} className="shimmer-bg h-3 rounded-md" style={{ width: `${w}%` }} />
                        ))}
                        <p className="text-xs text-ink-300 font-mono mt-1">Tinyfish is reasoning…</p>
                      </div>
                    ) : bd ? (
                      <div className="space-y-3">
                        {/* Two-column pros/cons */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs font-semibold text-sage-600 mb-1.5 uppercase tracking-wide">Pros</p>
                            <ul className="space-y-1">
                              {bd.pros?.map((pro, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-xs text-ink-600">
                                  <span className="text-sage-500 mt-0.5 flex-shrink-0">+</span>
                                  {pro}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-red-500 mb-1.5 uppercase tracking-wide">Cons</p>
                            <ul className="space-y-1">
                              {bd.cons?.map((con, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-xs text-ink-600">
                                  <span className="text-red-400 mt-0.5 flex-shrink-0">−</span>
                                  {con}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        {/* Verdict sentence */}
                        {bd.verdict && (
                          <p className="text-xs text-ink-500 border-t border-cream-100 pt-3 leading-relaxed italic">
                            {bd.verdict}
                          </p>
                        )}
                      </div>
                    ) : null}

                    {/* Action buttons inside breakdown */}
                    {!isLoading && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-cream-100">
                        <button
                          onClick={() => startAutofill(card)}
                          className="flex-1 text-xs bg-cream-100 hover:bg-ink-900 hover:text-cream-50 text-ink-600 rounded-lg py-2 font-medium transition-colors"
                        >
                          Auto-fill application →
                        </button>
                        {card.url && card.url !== '#' && (
                          <a
                            href={card.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs border border-cream-200 text-ink-400 hover:text-ink-700 rounded-lg px-3 py-2 transition-colors"
                          >
                            ↗
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Autofill panel */}
      {autofillState && (
        <AutofillPanel
          state={autofillState}
          onClose={() => setAutofillState(null)}
        />
      )}

      {/* Live browser panel (Tinyfish card list generation) */}
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
