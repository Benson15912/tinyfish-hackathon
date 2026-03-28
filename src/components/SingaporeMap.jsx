// components/SingaporeMap.jsx
// Custom SVG map of Singapore — no tiles, no surrounding countries.
import { useState } from 'react'

const W = 520, H = 360, PAD = 18
const LNG_MIN = 103.595, LNG_MAX = 104.055
const LAT_MAX = 1.482, LAT_MIN = 1.218

function toSVG(lat, lng) {
  const x = ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * (W - PAD * 2) + PAD
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * (H - PAD * 2) + PAD
  return [parseFloat(x.toFixed(1)), parseFloat(y.toFixed(1))]
}

function pts(pairs) {
  return pairs.map(([la, ln], i) => {
    const [x, y] = toSVG(la, ln)
    return `${i === 0 ? 'M' : 'L'}${x},${y}`
  }).join(' ') + ' Z'
}

// Singapore mainland approximate outline — clockwise from SW
const MAINLAND = [
  [1.263, 103.637],[1.248, 103.660],[1.245, 103.695],[1.248, 103.730],
  [1.255, 103.762],[1.262, 103.820],[1.278, 103.862],[1.288, 103.890],
  [1.300, 103.926],[1.315, 103.980],[1.350, 104.012],[1.370, 104.022],
  [1.400, 104.030],[1.420, 104.028],[1.445, 103.988],[1.458, 103.945],
  [1.462, 103.880],[1.462, 103.800],[1.456, 103.720],[1.448, 103.688],
  [1.418, 103.638],[1.375, 103.635],[1.330, 103.634],[1.300, 103.635],
  [1.263, 103.637],
]

const SENTOSA = [
  [1.250,103.818],[1.241,103.827],[1.238,103.848],[1.241,103.866],
  [1.249,103.868],[1.254,103.854],[1.254,103.830],
]

const JURONG_ISL = [
  [1.258,103.675],[1.244,103.682],[1.240,103.703],[1.244,103.724],
  [1.256,103.728],[1.263,103.710],[1.261,103.685],
]

const TOWN_COORDS = {
  'Ang Mo Kio':    [1.3691,103.8454], 'Bedok':         [1.3236,103.9273],
  'Bishan':        [1.3516,103.8487], 'Bukit Batok':   [1.3491,103.7495],
  'Bukit Panjang': [1.3774,103.7719], 'Bukit Timah':   [1.3294,103.7963],
  'Choa Chu Kang': [1.3840,103.7470], 'Clementi':      [1.3152,103.7649],
  'Geylang':       [1.3201,103.8888], 'Hougang':       [1.3720,103.8921],
  'Jurong East':   [1.3329,103.7436], 'Jurong West':   [1.3404,103.7090],
  'Kallang':       [1.3120,103.8709], 'Marine Parade': [1.3026,103.9067],
  'Pasir Ris':     [1.3721,103.9493], 'Punggol':       [1.4013,103.9022],
  'Queenstown':    [1.2942,103.7861], 'Sembawang':     [1.4491,103.8185],
  'Sengkang':      [1.3868,103.8914], 'Serangoon':     [1.3554,103.8679],
  'Tampines':      [1.3530,103.9453], 'Tengah':        [1.3486,103.7372],
  'Toa Payoh':     [1.3343,103.8563], 'Woodlands':     [1.4382,103.7891],
  'Yishun':        [1.4304,103.8354],
}

export function getMapCoords(town) {
  if (!town) return null
  const t = town.split(',')[0].trim()
  if (TOWN_COORDS[t]) return TOWN_COORDS[t]
  const lower = t.toLowerCase()
  for (const [k, v] of Object.entries(TOWN_COORDS))
    if (k.toLowerCase().includes(lower) || lower.includes(k.toLowerCase())) return v
  return null
}

export function SingaporeMap({ projects = [], userTown = '', selectedProject, onSelectProject, onHoverProject }) {
  const [tooltip, setTooltip] = useState(null)
  const userCoords = getMapCoords(userTown)

  return (
    <div className="relative w-full rounded-xl overflow-hidden" style={{ background: '#e8e4dc' }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ display: 'block' }}>

        {/* Sea background */}
        <rect width={W} height={H} fill="#ddd9d0" />

        {/* Subtle grid */}
        {[1,2,3,4].map(i => (
          <line key={`h${i}`} x1={PAD} y1={PAD+i*(H-PAD*2)/5} x2={W-PAD} y2={PAD+i*(H-PAD*2)/5}
            stroke="#ccc8be" strokeWidth="0.4" />
        ))}
        {[1,2,3,4,5,6].map(i => (
          <line key={`v${i}`} x1={PAD+i*(W-PAD*2)/7} y1={PAD} x2={PAD+i*(W-PAD*2)/7} y2={H-PAD}
            stroke="#ccc8be" strokeWidth="0.4" />
        ))}

        {/* Islands */}
        <path d={pts(JURONG_ISL)} fill="#cac5bc" stroke="#b8b2a8" strokeWidth="0.8" />
        <path d={pts(SENTOSA)}    fill="#cac5bc" stroke="#b8b2a8" strokeWidth="0.8" />

        {/* Mainland */}
        <path d={pts(MAINLAND)} fill="#f2efe8" stroke="#a8a09a" strokeWidth="1.5" strokeLinejoin="round" />

        {/* Preferred town halo */}
        {userCoords && (() => {
          const [x, y] = toSVG(...userCoords)
          return <circle cx={x} cy={y} r={26} fill="#64a05a" fillOpacity="0.13" stroke="#64a05a" strokeWidth="1" strokeDasharray="3 2" />
        })()}

        {/* BTO markers */}
        {projects.map(proj => {
          const c = getMapCoords(proj.town)
          if (!c) return null
          const [x, y] = toSVG(...c)
          const isSel = selectedProject?.name === proj.name
          const isTop = proj.rank === 1
          return (
            <g key={proj.name} style={{ cursor: 'pointer' }}
              onClick={() => onSelectProject(proj)}
              onMouseEnter={() => { setTooltip({ proj, x, y }); onHoverProject?.(proj) }}
              onMouseLeave={() => { setTooltip(null); onHoverProject?.(null) }}
            >
              {isSel && <circle cx={x} cy={y} r={17} fill="#1c1917" fillOpacity="0.12" />}
              <circle cx={x} cy={y}
                r={isSel ? 13 : isTop ? 11 : 9}
                fill={isSel ? '#1c1917' : isTop ? '#f59e0b' : '#6b7280'}
                stroke="white" strokeWidth="2"
              />
              <text x={x} y={y+1} textAnchor="middle" dominantBaseline="middle"
                fill="white" fontSize={isSel ? 9 : 8} fontWeight="700">
                {proj.rank}
              </text>
            </g>
          )
        })}

        {/* User location pin */}
        {userCoords && (() => {
          const [x, y] = toSVG(...userCoords)
          return (
            <g>
              <circle cx={x} cy={y} r={7} fill="#4a7c59" stroke="white" strokeWidth="2" />
              <circle cx={x} cy={y} r={2.5} fill="white" />
            </g>
          )
        })()}

        {/* Tooltip */}
        {tooltip && (() => {
          const { proj, x, y } = tooltip
          const bw = 150, bh = proj.price_from ? 52 : 38
          const tx = Math.max(PAD, Math.min(x - bw/2, W - bw - PAD))
          const ty = y > H / 2 ? y - bh - 12 : y + 16
          return (
            <g pointerEvents="none">
              <rect x={tx} y={ty} width={bw} height={bh} rx={5} fill="#1c1917" fillOpacity="0.92" />
              <text x={tx+8} y={ty+14} fill="#faf8f4" fontSize="10" fontWeight="600">#{proj.rank} {proj.name}</text>
              <text x={tx+8} y={ty+27} fill="#9a9290" fontSize="9">{proj.town} · Est. {proj.completion_estimate || '?'}</text>
              {proj.price_from && (
                <text x={tx+8} y={ty+40} fill="#9a9290" fontSize="9">
                  From SGD {Number(proj.price_from).toLocaleString()}
                </text>
              )}
            </g>
          )
        })()}

        {/* North indicator */}
        <text x={W-24} y={H-10} textAnchor="middle" fontSize="9" fill="#9a9290" fontWeight="600">N ↑</text>
      </svg>

      {/* Legend */}
      <div className="absolute bottom-2 left-3 flex items-center gap-3 pointer-events-none">
        <span className="flex items-center gap-1 text-xs text-ink-400">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block border border-white" /> #1
        </span>
        <span className="flex items-center gap-1 text-xs text-ink-400">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-500 inline-block border border-white" /> Projects
        </span>
        {userCoords && (
          <span className="flex items-center gap-1 text-xs text-ink-400">
            <span className="w-2.5 h-2.5 rounded-full bg-sage-500 inline-block border border-white" /> Your area
          </span>
        )}
      </div>
    </div>
  )
}
