// components/CardModule.jsx
import { useState } from 'react'
import { runAutomationSSE, buildCardAutofillTask, personaliseCardList, extractResultText } from '../lib/tinyfish'
import { generateFallbackBreakdown } from '../lib/cardDatabase'
import { parseProfile } from '../lib/profile'
import { AutofillPanel } from './AutofillPanel'
import { BrowserPanel } from './BrowserPanel'

export function CardModule({ profileMd, apiKey }) {
  const [panel, setPanel] = useState(null)
  const [panelVisible, setPanelVisible] = useState(false)

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
  // ─── Tinyfish: card list ─────────────────────────────────────────────────

  function refreshCardList() {
    localStorage.removeItem(CARDS_CACHE_KEY)
    localStorage.removeItem(BREAKDOWNS_CACHE_KEY)
    setBreakdowns({})
    setExpanded({})
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
            // Pre-populate breakdowns from Tinyfish's own pros/cons
            const freshBreakdowns = {}
            for (const c of cards) {
              if (c.pros?.length || c.cons?.length) {
                freshBreakdowns[c.name] = { pros: c.pros || [], cons: c.cons || [], verdict: c.verdict || '' }
              }
            }
            if (Object.keys(freshBreakdowns).length > 0) {
              setBreakdowns(freshBreakdowns)
              try { localStorage.setItem(BREAKDOWNS_CACHE_KEY, JSON.stringify(freshBreakdowns)) } catch {}
            }
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

  // ─── Per-card breakdown ──────────────────────────────────────────────────

  function toggleBreakdown(card) {
    // Toggle if already loaded
    if (breakdowns[card.name]) {
      setExpanded(e => ({ ...e, [card.name]: !e[card.name] }))
      return
    }

    setExpanded(e => ({ ...e, [card.name]: true }))

    // 1. Use pros/cons Tinyfish returned with the card — instant, no extra API call
    if (card.pros?.length || card.cons?.length) {
      const data = { pros: card.pros || [], cons: card.cons || [], verdict: card.verdict || '' }
      setBreakdowns(b => {
        const updated = { ...b, [card.name]: data }
        try { localStorage.setItem(BREAKDOWNS_CACHE_KEY, JSON.stringify(updated)) } catch {}
        return updated
      })
      return
    }

    // 2. Fallback: derive from tag (no API call) — for cached cards without pros/cons
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
    setPanelVisible(true)
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


  const totalSpend = ['dining_spend', 'grocery_spend', 'transport_spend', 'online_spend', 'petrol_spend']
    .reduce((s, k) => s + parseFloat(profile[k] || 0), 0)

  const spendCategories = [
    { label: 'Dining', key: 'dining_spend', icon: '🍜' },
    { label: 'Grocery', key: 'grocery_spend', icon: '🛒' },
    { label: 'Transport', key: 'transport_spend', icon: '🚌' },
    { label: 'Online', key: 'online_spend', icon: '🛍️' },
    { label: 'Petrol', key: 'petrol_spend', icon: '⛽' },
  ].filter(c => parseFloat(profile[c.key] || 0) > 0)

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="font-display text-2xl text-ink-900">Credit cards</h2>
        <p className="text-sm text-ink-500 mt-0.5">
          Tinyfish finds and reasons about the best cards for you
        </p>
      </div>

      {/* ── Profile snapshot tile ─────────────────────────────────────────── */}
      <div className="bg-white border border-cream-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-ink-400 uppercase tracking-widest font-mono mb-0.5">AI context</p>
            <h3 className="font-display text-base text-ink-900">What Tinyfish knows about you</h3>
          </div>
          <span className="text-xs bg-sage-400/10 text-sage-600 rounded-full px-2.5 py-1 font-medium">✦ Live</span>
        </div>

        {/* Income + total spend */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-ink-900 rounded-xl p-3.5">
            <p className="text-xs text-cream-200/50 uppercase tracking-wide font-mono mb-1">Annual income</p>
            <p className="font-display text-xl text-cream-50">
              SGD {profile.income_monthly
                ? (parseFloat(profile.income_monthly) * 12).toLocaleString()
                : '—'}
            </p>
            {profile.income_monthly && (
              <p className="text-xs text-cream-200/50 mt-0.5">
                SGD {parseInt(profile.income_monthly).toLocaleString()}/mo
              </p>
            )}
          </div>
          <div className="bg-cream-50 border border-cream-200 rounded-xl p-3.5">
            <p className="text-xs text-ink-400 uppercase tracking-wide font-mono mb-1">Monthly spend</p>
            <p className="font-display text-xl text-ink-900">
              SGD {totalSpend > 0 ? totalSpend.toLocaleString() : '—'}
            </p>
            {totalSpend > 0 && (
              <p className="text-xs text-ink-400 mt-0.5">across {spendCategories.length} categories</p>
            )}
          </div>
        </div>

        {/* Spend breakdown bars */}
        {spendCategories.length > 0 && (
          <div className="space-y-2 mb-4">
            {spendCategories.map(c => {
              const amt = parseFloat(profile[c.key] || 0)
              const pct = totalSpend > 0 ? (amt / totalSpend) * 100 : 0
              return (
                <div key={c.key}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs text-ink-500">{c.icon} {c.label}</span>
                    <span className="text-xs font-mono text-ink-700">SGD {amt.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 bg-cream-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sage-400 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Profile chips */}
        <div className="flex flex-wrap gap-1.5">
          {profile.citizenship && (
            <span className="text-xs bg-cream-100 text-ink-500 rounded-full px-2.5 py-1">
              {profile.citizenship}
            </span>
          )}
          {profile.age && (
            <span className="text-xs bg-cream-100 text-ink-500 rounded-full px-2.5 py-1">
              Age {profile.age}
            </span>
          )}
          {profile.preferred_rewards && (
            <span className="text-xs bg-cream-100 text-ink-500 rounded-full px-2.5 py-1 capitalize">
              Prefers {profile.preferred_rewards}
            </span>
          )}
          {profile.willing_annual_fee && (
            <span className="text-xs bg-cream-100 text-ink-500 rounded-full px-2.5 py-1">
              Annual fee: {profile.willing_annual_fee === 'yes' ? 'OK' : profile.willing_annual_fee === 'waiver' ? 'Waiver only' : 'No'}
            </span>
          )}
          {profile.travel_frequency && (
            <span className="text-xs bg-cream-100 text-ink-500 rounded-full px-2.5 py-1 capitalize">
              Travels {profile.travel_frequency}
            </span>
          )}
          {profile.transport_mode && (
            <span className="text-xs bg-cream-100 text-ink-500 rounded-full px-2.5 py-1 capitalize">
              {profile.transport_mode.replace(/-/g, ' ')}
            </span>
          )}
          {profile.dining_preference && (
            <span className="text-xs bg-cream-100 text-ink-500 rounded-full px-2.5 py-1 capitalize">
              Dining: {profile.dining_preference}
            </span>
          )}
          {profile.card_primary_goal && (
            <span className="text-xs bg-gold-400/10 text-gold-700 rounded-full px-2.5 py-1">
              Goal: {profile.card_primary_goal}
            </span>
          )}
          {profile.risk_tolerance && (
            <span className="text-xs bg-cream-100 text-ink-500 rounded-full px-2.5 py-1">
              {profile.risk_tolerance.split('—')[0].trim()}
            </span>
          )}
          {profile.existing_debt && profile.existing_debt !== 'none' && (
            <span className="text-xs bg-cream-100 text-ink-500 rounded-full px-2.5 py-1 capitalize">
              Debt: {profile.existing_debt}
            </span>
          )}
          {profile.big_purchase_next_year && profile.big_purchase_next_year !== 'none' && (
            <span className="text-xs bg-sage-400/10 text-sage-600 rounded-full px-2.5 py-1 capitalize">
              Planning: {profile.big_purchase_next_year}
            </span>
          )}
        </div>
      </div>

      {noKeyBanner}

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
          <div className="flex items-center gap-2">
            {panel && (
              <button
                onClick={() => setPanelVisible(v => !v)}
                className={`flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 font-medium transition-colors
                  ${panelVisible
                    ? 'bg-ink-900 text-cream-50 hover:bg-ink-700'
                    : 'bg-cream-100 text-ink-600 hover:bg-ink-900 hover:text-cream-50'}`}
              >
                {cardsLoading
                  ? <><span className="animate-pulse text-amber-400">✦</span> {panelVisible ? 'Hide' : 'View progress'}</>
                  : <><span>✦</span> {panelVisible ? 'Hide' : 'View result'}</>}
              </button>
            )}
            <button
              onClick={refreshCardList}
              disabled={cardsLoading}
              className="text-xs text-ink-300 hover:text-ink-600 transition-colors disabled:opacity-40"
              title="Re-run Tinyfish to refresh card picks"
            >
              ⟳ Refresh
            </button>
          </div>
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
                  {/* Rank badge */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                    ${card.rank === 1 ? 'bg-gold-400/20 text-gold-700' : 'bg-cream-100 text-ink-400'}`}>
                    {card.rank || '—'}
                  </div>
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
      {panel && panelVisible && (
        <BrowserPanel
          taskName={panel.taskName}
          streamingUrl={panel.streamingUrl}
          log={panel.log}
          rawResult={panel.rawResult}
          status={panel.status}
          onClose={() => setPanelVisible(false)}
        />
      )}
    </div>
  )
}
