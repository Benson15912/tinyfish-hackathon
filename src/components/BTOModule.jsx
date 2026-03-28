// components/BTOModule.jsx
import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { runAutomationSSE, buildBTOAutofillTask, getBTOGuidance, getGrantEligibility, getBTOProjects, extractResultText } from '../lib/tinyfish'
import { parseProfile } from '../lib/profile'
import { AutofillPanel } from './AutofillPanel'
import { BrowserPanel } from './BrowserPanel'

const TOWN_COORDS = {
  'Ang Mo Kio':[1.3691,103.8454],'Bedok':[1.3236,103.9273],'Bishan':[1.3516,103.8487],
  'Bukit Batok':[1.3491,103.7495],'Bukit Panjang':[1.3774,103.7719],'Bukit Timah':[1.3294,103.7963],
  'Choa Chu Kang':[1.3840,103.7470],'Clementi':[1.3152,103.7649],'Geylang':[1.3201,103.8888],
  'Hougang':[1.3720,103.8921],'Jurong East':[1.3329,103.7436],'Jurong West':[1.3404,103.7090],
  'Kallang':[1.3120,103.8709],'Marine Parade':[1.3026,103.9067],'Pasir Ris':[1.3721,103.9493],
  'Punggol':[1.4013,103.9022],'Queenstown':[1.2942,103.7861],'Sembawang':[1.4491,103.8185],
  'Sengkang':[1.3868,103.8914],'Serangoon':[1.3554,103.8679],'Tampines':[1.3530,103.9453],
  'Tengah':[1.3486,103.7372],'Toa Payoh':[1.3343,103.8563],'Woodlands':[1.4382,103.7891],
  'Yishun':[1.4304,103.8354],
}

function getCoords(town) {
  if (!town) return null
  const t = (typeof town === 'string' ? town : town[0] || '').split(',')[0].trim()
  if (TOWN_COORDS[t]) return TOWN_COORDS[t]
  const lower = t.toLowerCase()
  for (const [k, v] of Object.entries(TOWN_COORDS))
    if (k.toLowerCase().includes(lower) || lower.includes(k.toLowerCase())) return v
  return null
}

// Fit map to project markers + user town on load
function MapFitter({ projects, userCoords }) {
  const map = useMap()
  useEffect(() => {
    const points = [...projects.map(p => getCoords(p.town)).filter(Boolean), userCoords].filter(Boolean)
    if (points.length > 0) map.fitBounds(points, { padding: [36, 36] })
  }, [projects, userCoords]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

const BTO_CHECKLIST = [
  { id: 'hfe',    label: 'Get HFE letter',        desc: 'Apply for Housing Flat Eligibility before balloting',      url: 'https://www.hdb.gov.sg/residential/buying-a-flat/finding-a-flat/housing-loan/flat-eligibility' },
  { id: 'ballot', label: 'Submit ballot',          desc: 'Apply during the BTO launch window',                       url: 'https://www.hdb.gov.sg/residential/buying-a-flat/finding-a-flat/new-flats/bto-and-sleb' },
  { id: 'select', label: 'Flat selection',         desc: 'Choose your unit based on queue number',                   url: null },
  { id: 'lease',  label: 'Sign Agreement for Lease', desc: 'Pay downpayment and sign lease',                        url: null },
  { id: 'wait',   label: 'Wait for completion',    desc: 'Construction takes 3–5 years',                             url: null },
  { id: 'keys',   label: 'Key collection',         desc: 'Collect keys and move in!',                                url: null },
]

const PROJECTS_CACHE_KEY = 'adulting_sg_bto_projects'

export function BTOModule({ profileMd }) {
  const profile = parseProfile(profileMd)

  // Phase: 'discover' | 'checklist'
  const [phase, setPhase] = useState('discover')
  const [selectedProject, setSelectedProject] = useState(null)

  // BTO projects
  const [projects, setProjects] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PROJECTS_CACHE_KEY) || 'null') || [] } catch { return [] }
  })
  const [projectsLoading, setProjectsLoading] = useState(false)

  // Grants
  const [grants, setGrants] = useState('')
  const [grantsLoading, setGrantsLoading] = useState(false)

  // Checklist
  const [currentStep, setCurrentStep] = useState(0)

  // Guidance
  const [guidance, setGuidance] = useState('')
  const [guidanceLoading, setGuidanceLoading] = useState(false)

  const [panel, setPanel] = useState(null)
  const [autofillState, setAutofillState] = useState(null)
  const [hoveredProject, setHoveredProject] = useState(null)

  // User's preferred town
  const userTown = profile.preferred_towns || ''

  // ─── Tinyfish: BTO projects ──────────────────────────────────────────────

  function loadProjects() {
    setProjectsLoading(true)
    setProjects([])
    localStorage.removeItem(PROJECTS_CACHE_KEY)
    setPanel({ taskName: 'Finding available BTO projects…', streamingUrl: null, log: [], rawResult: null, status: 'running' })

    getBTOProjects({
      profile,
      onEvent: (ev) => {
        if (ev.streaming_url) setPanel(p => p ? { ...p, streamingUrl: ev.streaming_url } : p)
        if (ev.type === 'PROGRESS' || ev.type === 'STARTED') setPanel(p => p ? { ...p, log: [...(p.log || []), ev.purpose || ev.type] } : p)
      },
      onDone: (ev) => {
        setPanel(p => p ? { ...p, rawResult: ev, status: 'done' } : p)
        try {
          const raw = typeof ev.result === 'string' ? ev.result : JSON.stringify(ev.result)
          const match = raw.match(/\[[\s\S]*\]/)
          const parsed = JSON.parse(match ? match[0] : raw)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProjects(parsed)
            localStorage.setItem(PROJECTS_CACHE_KEY, JSON.stringify(parsed))
          }
        } catch {}
        setProjectsLoading(false)
      },
      onError: (msg) => {
        setPanel(p => p ? { ...p, status: 'error', rawResult: msg } : p)
        setProjectsLoading(false)
      },
    })
  }

  // ─── Tinyfish: grants ────────────────────────────────────────────────────

  function loadGrants() {
    setGrantsLoading(true)
    setGrants('')
    setPanel({ taskName: 'Grant eligibility — HDB & CPF research', streamingUrl: null, log: [], rawResult: null, status: 'running' })
    getGrantEligibility({
      profile,
      onEvent: (ev) => {
        if (ev.streaming_url) setPanel(p => p ? { ...p, streamingUrl: ev.streaming_url } : p)
        if (ev.type === 'PROGRESS' || ev.type === 'STARTED') setPanel(p => p ? { ...p, log: [...(p.log || []), ev.purpose || ev.type] } : p)
      },
      onDone: (ev) => {
        const text = extractResultText(ev.result) || extractResultText(ev)
        setGrants(text || '')
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

  // ─── Tinyfish: guidance ──────────────────────────────────────────────────

  function loadGuidance() {
    setGuidanceLoading(true)
    setGuidance('')
    setPanel({ taskName: 'BTO guidance — HDB research', streamingUrl: null, log: [], rawResult: null, status: 'running' })
    getBTOGuidance({
      profile,
      onEvent: (ev) => {
        if (ev.streaming_url) setPanel(p => p ? { ...p, streamingUrl: ev.streaming_url } : p)
        if (ev.type === 'PROGRESS' || ev.type === 'STARTED') setPanel(p => p ? { ...p, log: [...(p.log || []), ev.purpose || ev.type] } : p)
      },
      onDone: (ev) => {
        const text = extractResultText(ev.result) || extractResultText(ev)
        setGuidance(text || '')
        setPanel(p => p ? { ...p, rawResult: ev, status: 'done' } : p)
        setGuidanceLoading(false)
      },
      onError: (msg) => {
        setGuidance(`Error: ${msg}`)
        setPanel(p => p ? { ...p, status: 'error', rawResult: msg } : p)
        setGuidanceLoading(false)
      },
    })
  }

  // ─── Autofill ────────────────────────────────────────────────────────────

  function startAutofill(step) {
    if (!step.url) return
    if (profile.autofill_consented !== 'true') {
      if (!window.confirm('Adulting SG will fill this HDB form using your profile.\n\nYour data stays on your device. Review before submitting.\n\nContinue?')) return
    }
    const task = buildBTOAutofillTask(profile, step.url)
    const events = []
    setAutofillState({ url: step.url, card: step.label, events: [], status: 'running', streamingUrl: null })
    const ctrl = runAutomationSSE({
      url: step.url,
      goal: task,
      onEvent: (ev) => {
        events.push(ev)
        setAutofillState(s => ({ ...s, events: [...events], streamingUrl: ev.streaming_url || s?.streamingUrl, status: ev.type === 'COMPLETE' ? 'done' : 'running', result: ev.result || s?.result }))
      },
      onDone: (ev) => setAutofillState(s => ({ ...s, status: 'done', result: ev.result })),
      onError: (msg) => setAutofillState(s => ({ ...s, status: 'error', errorMsg: msg })),
    })
    setAutofillState(s => ({ ...s, _ctrl: ctrl }))
  }

  const darkProse = `prose prose-sm max-w-none
    prose-headings:text-cream-50 prose-headings:font-display prose-headings:font-normal prose-headings:text-base prose-headings:mt-3 prose-headings:mb-1.5 first:prose-headings:mt-0
    prose-strong:text-cream-100 prose-strong:font-semibold
    prose-p:text-cream-200/80 prose-p:leading-relaxed prose-p:my-1
    prose-li:text-cream-200/70 prose-ul:my-1
    prose-table:text-sm prose-th:text-cream-200 prose-th:font-semibold prose-td:text-cream-200/70`

  const lightProse = `prose prose-sm max-w-none
    prose-h2:font-display prose-h2:text-base prose-h2:font-normal prose-h2:text-ink-900
    prose-strong:font-medium prose-strong:text-ink-700
    prose-p:text-ink-600 prose-p:leading-relaxed prose-li:text-ink-600`

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-ink-900">BTO journey</h2>
          <p className="text-sm text-ink-500 mt-0.5">Find your project, then track your roadmap</p>
        </div>
        {phase === 'checklist' && selectedProject && (
          <button
            onClick={() => setPhase('discover')}
            className="text-xs text-ink-400 hover:text-ink-700 transition-colors"
          >
            ← Back to projects
          </button>
        )}
      </div>

      {/* ── PHASE 1: Project discovery ───────────────────────────────────── */}
      {phase === 'discover' && (
        <>
          {/* Map */}
          <div className="bg-white border border-cream-200 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-cream-100">
              <div>
                <p className="text-xs text-ink-400 uppercase tracking-widest font-mono mb-0.5">Live data</p>
                <h3 className="font-display text-base text-ink-900">Available BTO projects</h3>
              </div>
              <button
                onClick={loadProjects}
                disabled={projectsLoading}
                className="flex items-center gap-1.5 text-xs bg-ink-900 text-cream-50 rounded-lg px-3 py-1.5 font-medium hover:bg-ink-700 transition-colors disabled:opacity-50"
              >
                {projectsLoading
                  ? <><span className="animate-pulse-soft">●</span> Searching…</>
                  : <><span>✦</span> {projects.length ? 'Refresh' : 'Find projects'}</>}
              </button>
            </div>

            {/* Leaflet map — z-index isolated so BrowserPanel floats above */}
            <div style={{ position: 'relative', zIndex: 0, isolation: 'isolate' }}>
              <MapContainer
                center={[1.3521, 103.8198]}
                zoom={11}
                minZoom={10}
                maxZoom={13}
                maxBounds={[[1.1, 103.5], [1.55, 104.15]]}
                scrollWheelZoom={false}
                style={{ height: '280px', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                />
                <MapFitter projects={projects} userCoords={getCoords(userTown)} />
                {/* User preferred town halo */}
                {getCoords(userTown) && (
                  <CircleMarker
                    center={getCoords(userTown)}
                    radius={18}
                    pathOptions={{ color: '#6b7280', fillColor: '#6b7280', fillOpacity: 0.08, weight: 1.5, dashArray: '4 3' }}
                  />
                )}
                {/* Project markers */}
                {projects.map((proj) => {
                  const coords = getCoords(proj.town)
                  if (!coords) return null
                  const isSelected = selectedProject?.name === proj.name
                  const isTop = proj.rank === 1
                  return (
                    <CircleMarker
                      key={proj.name}
                      center={coords}
                      radius={isSelected ? 10 : isTop ? 9 : 7}
                      pathOptions={{
                        color: isSelected ? '#1a1a1a' : isTop ? '#b8972e' : '#6b7280',
                        fillColor: isSelected ? '#1a1a1a' : isTop ? '#d4a843' : '#9ca3af',
                        fillOpacity: isSelected ? 0.9 : 0.7,
                        weight: isSelected ? 2 : 1.5,
                      }}
                      eventHandlers={{
                        click: () => setSelectedProject(p => p?.name === proj.name ? null : proj),
                        mouseover: () => setHoveredProject(proj),
                        mouseout: () => setHoveredProject(null),
                      }}
                    >
                      <Popup>
                        <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
                          <p style={{ fontWeight: 600, margin: 0 }}>{proj.name}</p>
                          <p style={{ color: '#6b7280', margin: 0 }}>{proj.town} · #{proj.rank}</p>
                        </div>
                      </Popup>
                    </CircleMarker>
                  )
                })}
              </MapContainer>
            </div>
          </div>

          {/* Loading skeleton */}
          {projectsLoading && projects.length === 0 && (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white border border-cream-200 rounded-xl p-4">
                  <div className="shimmer-bg h-4 rounded w-2/3 mb-2" />
                  <div className="shimmer-bg h-3 rounded w-1/3" />
                </div>
              ))}
            </div>
          )}

          {/* Ranked project list */}
          {projects.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-ink-400 uppercase tracking-widest font-mono">Ranked for you — {projects.length} projects</p>
              {projects.map((proj) => {
                const isSelected = selectedProject?.name === proj.name
                return (
                  <div
                    key={proj.name}
                    className={`bg-white border rounded-2xl overflow-hidden cursor-pointer transition-all
                      ${isSelected ? 'border-ink-900 shadow-md' : 'border-cream-200 hover:border-sage-300'}`}
                    onClick={() => setSelectedProject(isSelected ? null : proj)}
                    onMouseEnter={() => setHoveredProject(proj)}
                    onMouseLeave={() => setHoveredProject(null)}
                  >
                    {/* Project row */}
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                        ${proj.rank === 1 ? 'bg-gold-400/20 text-gold-700' : 'bg-cream-100 text-ink-400'}`}>
                        {proj.rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-ink-900 text-sm leading-tight">{proj.name}</p>
                        <p className="text-xs text-ink-400">{proj.town} · Est. {proj.completion_estimate || '?'}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {proj.price_from && (
                          <p className="text-xs font-mono text-ink-700">
                            From SGD {proj.price_from >= 1000 ? (proj.price_from / 1000).toFixed(0) + 'k' : proj.price_from}
                          </p>
                        )}
                        <span className="text-xs bg-sage-400/10 text-sage-600 rounded-full px-2 py-0.5 font-medium">
                          {proj.tag}
                        </span>
                      </div>
                      <span className="text-ink-300 text-sm ml-1">{isSelected ? '▲' : '▼'}</span>
                    </div>

                    {/* Expanded detail */}
                    {isSelected && (
                      <div className="border-t border-cream-100 px-4 py-4 space-y-4">
                        {/* Flat types + price */}
                        <div className="flex flex-wrap gap-2">
                          {proj.flat_types?.map(ft => (
                            <span key={ft} className="text-xs bg-cream-100 text-ink-600 rounded-full px-2.5 py-1">{ft}</span>
                          ))}
                          {proj.price_from && proj.price_to && (
                            <span className="text-xs bg-ink-100 text-ink-700 rounded-full px-2.5 py-1 font-mono">
                              SGD {proj.price_from.toLocaleString()} – {proj.price_to.toLocaleString()}
                            </span>
                          )}
                        </div>

                        {/* Pros / Cons */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs font-semibold text-sage-600 mb-1.5 uppercase tracking-wide">Pros</p>
                            <ul className="space-y-1">
                              {proj.pros?.map((p, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-xs text-ink-600">
                                  <span className="text-sage-500 mt-0.5 flex-shrink-0">+</span>{p}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-red-500 mb-1.5 uppercase tracking-wide">Cons</p>
                            <ul className="space-y-1">
                              {proj.cons?.map((c, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-xs text-ink-600">
                                  <span className="text-red-400 mt-0.5 flex-shrink-0">−</span>{c}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Reasoning */}
                        {proj.reasoning && (
                          <p className="text-xs text-ink-400 italic border-t border-cream-100 pt-3">{proj.reasoning}</p>
                        )}

                        {/* CTA */}
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedProject(proj); setPhase('checklist') }}
                            className="flex-1 text-xs bg-ink-900 text-cream-50 rounded-lg py-2.5 font-medium hover:bg-ink-700 transition-colors"
                          >
                            Choose this project — start checklist →
                          </button>
                          {proj.url && proj.url !== '#' && (
                            <a
                              href={proj.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="text-xs border border-cream-200 text-ink-400 hover:text-ink-700 rounded-lg px-3 py-2 transition-colors"
                            >
                              ↗ HDB
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Empty state */}
          {projects.length === 0 && !projectsLoading && (
            <div className="bg-cream-50 border border-cream-200 rounded-xl px-4 py-8 text-center">
              <p className="text-sm text-ink-500 mb-3">
                Tinyfish will browse HDB's website and find all current BTO launches, ranked for your profile.
              </p>
              <button
                onClick={loadProjects}
                className="text-xs bg-ink-900 text-cream-50 rounded-lg px-4 py-2 font-medium hover:bg-ink-700 transition-colors"
              >
                ✦ Find available BTO projects
              </button>
            </div>
          )}
        </>
      )}

      {/* ── PHASE 2: Checklist ───────────────────────────────────────────── */}
      {phase === 'checklist' && selectedProject && (
        <>
          {/* Selected project card */}
          <div className="bg-ink-900 text-cream-50 rounded-2xl p-5">
            <p className="text-xs text-cream-200/50 uppercase tracking-widest font-mono mb-1">Selected project</p>
            <h3 className="font-display text-xl text-cream-50">{selectedProject.name}</h3>
            <p className="text-sm text-cream-200/60">{selectedProject.town} · Est. {selectedProject.completion_estimate || '?'} · #{selectedProject.rank} ranked for you</p>
            {selectedProject.price_from && (
              <p className="text-xs text-cream-200/50 mt-1 font-mono">
                SGD {selectedProject.price_from.toLocaleString()} – {selectedProject.price_to?.toLocaleString()}
              </p>
            )}
          </div>

          {/* Grant eligibility */}
          <div className="bg-white border border-cream-200 rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <p className="text-xs text-ink-400 uppercase tracking-widest font-mono mb-0.5">Tinyfish research</p>
                <h3 className="font-display text-base text-ink-900">What grants am I eligible for?</h3>
              </div>
              <button
                onClick={loadGrants}
                disabled={grantsLoading}
                className="flex items-center gap-1.5 text-xs bg-ink-900 text-cream-50 rounded-lg px-3 py-1.5 font-medium hover:bg-ink-700 transition-colors disabled:opacity-50 whitespace-nowrap flex-shrink-0"
              >
                {grantsLoading ? <><span className="animate-pulse-soft">●</span> Checking…</> : <><span>✦</span> Check grants</>}
              </button>
            </div>
            {!grants && !grantsLoading && (
              <p className="text-xs text-ink-400">Find out which HDB grants you qualify for — EHG, CPF Housing Grant, PHG — and how much.</p>
            )}
            {grantsLoading && !grants && (
              <div className="space-y-2 mt-2">{[80, 65, 90, 55].map((w, i) => <div key={i} className="shimmer-bg h-3 rounded-md" style={{ width: `${w}%` }} />)}</div>
            )}
            {grants && <div className={lightProse}><ReactMarkdown>{grants}</ReactMarkdown></div>}
          </div>

          {/* Checklist */}
          <div className="bg-white border border-cream-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-ink-400 uppercase tracking-wide font-medium">Your BTO checklist</p>
              <button
                onClick={loadGuidance}
                disabled={guidanceLoading}
                className="flex items-center gap-1.5 text-xs bg-cream-100 hover:bg-ink-900 hover:text-cream-50 text-ink-600 rounded-lg px-3 py-1.5 font-medium transition-colors disabled:opacity-50"
              >
                {guidanceLoading ? <><span className="animate-pulse-soft">●</span> Analysing…</> : <><span>✦</span> Get guidance</>}
              </button>
            </div>
            <div className="space-y-1">
              {BTO_CHECKLIST.map((step, i) => {
                const done = i < currentStep
                const active = i === currentStep
                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors
                      ${active ? 'bg-sage-400/10 border border-sage-400/20' : 'hover:bg-cream-50'}`}
                    onClick={() => setCurrentStep(i)}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono flex-shrink-0
                      ${done ? 'bg-sage-500 text-white' : active ? 'bg-cream-200 text-ink-700 border-2 border-sage-500' : 'bg-cream-200 text-ink-400'}`}>
                      {done ? '✓' : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${done ? 'text-ink-400 line-through' : 'text-ink-900'}`}>{step.label}</p>
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
                    {!step.url && active && <span className="text-xs text-ink-300 whitespace-nowrap">Manual step</span>}
                    {done && (
                      <button onClick={(e) => { e.stopPropagation(); setCurrentStep(i) }} className="text-xs text-ink-300 hover:text-ink-600 transition-colors">Undo</button>
                    )}
                  </div>
                )
              })}
            </div>
            {currentStep > 0 && currentStep < BTO_CHECKLIST.length && (
              <button
                onClick={() => setCurrentStep(s => s + 1)}
                className="mt-4 w-full text-xs border border-sage-400/30 text-sage-600 rounded-xl py-2.5 font-medium hover:bg-sage-400/10 transition-colors"
              >
                Mark "{BTO_CHECKLIST[currentStep].label}" as done →
              </button>
            )}
          </div>

          {/* Guidance output */}
          {(guidance || guidanceLoading) && (
            <div className="bg-white border border-cream-200 rounded-2xl p-5">
              {guidanceLoading && !guidance && (
                <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="shimmer-bg h-4 rounded-lg" style={{ width: `${90 - i * 8}%` }} />)}</div>
              )}
              {guidance && <div className={lightProse}><ReactMarkdown>{guidance}</ReactMarkdown></div>}
            </div>
          )}
        </>
      )}

      {/* Autofill panel */}
      {autofillState && <AutofillPanel state={autofillState} onClose={() => setAutofillState(null)} />}

      {/* Browser panel */}
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
