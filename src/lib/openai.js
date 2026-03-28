// lib/openai.js
// All reasoning tasks now powered by Tinyfish — same function signatures as before.
// Tinyfish handles both web research AND reasoning.

import { runAutomationSSE, extractResultText } from './tinyfish'

// Always "active" — no separate API key needed beyond Tinyfish
export function getStoredApiKey() { return 'tinyfish' }
export function saveApiKey() {}
export async function testApiKey() { return true }

// ─── Profile context block ─────────────────────────────────────────────────

const _v = (v, fallback = 'not provided') =>
  (!v || v === 'not-sure' || v === 'not sure') ? fallback : v

function profileContext(p) {
  const annual = (parseFloat(p.income_monthly || 0) * 12).toFixed(0)
  const totalSpend = ['dining_spend', 'grocery_spend', 'transport_spend', 'online_spend', 'petrol_spend']
    .reduce((s, k) => s + parseFloat(p[k] || 0), 0)
  return `User profile (Singapore resident):
- Name: ${_v(p.name)}, Age: ${_v(p.age)}, Citizenship: ${_v(p.citizenship, 'SC')}, ${_v(p.relationship_status, 'single')}
- Annual income: SGD ${annual} (SGD ${_v(p.income_monthly)}/mo)
- Monthly spend total: SGD ${totalSpend.toFixed(0)}/mo
  Dining ${_v(p.dining_spend, '0')} · Grocery ${_v(p.grocery_spend, '0')} · Transport ${_v(p.transport_spend, '0')} · Online ${_v(p.online_spend, '0')} · Petrol ${_v(p.petrol_spend, '0')} · Bills ${_v(p.monthly_bills_spend, '0')}
- Transport: ${_v(p.transport_mode, 'public-transport')} · Dining: ${_v(p.dining_preference, 'mixed')}
- Preferred rewards: ${_v(p.preferred_rewards, 'cashback')} · Annual fee: ${_v(p.willing_annual_fee, 'no')} · Travel: ${_v(p.travel_frequency, 'occasionally')}
- Primary card goal: ${_v(p.card_primary_goal)}
- Risk tolerance: ${_v(p.risk_tolerance)} · Existing debt: ${_v(p.existing_debt, 'none')}
- Emergency fund: ${_v(p.emergency_fund)} · Big purchase soon: ${_v(p.big_purchase_next_year, 'none')}
- Invests: ${_v(p.has_investments)}${p.investment_type && p.investment_type !== 'not-sure' ? ` via ${p.investment_type}` : ''}`
}

// ─── Card breakdown → { pros, cons, verdict } ─────────────────────────────

export function getCardBreakdownAI({ card, profile, apiKey, onDone, onError }) {
  const firstName = (profile.name || 'you').split(' ')[0]
  const annual = (parseFloat(profile.income_monthly || 0) * 12).toFixed(0)
  const startUrl = card.url && card.url !== '#'
    ? card.url
    : 'https://www.moneysmart.sg/credit-cards'

  runAutomationSSE({
    url: startUrl,
    goal: `Go to ${startUrl} and research the ${card.name} credit card by ${card.bank}.

${profileContext(profile)}

Look for: annual fee & waiver conditions, minimum income requirement, cashback/miles rates, minimum monthly spend to unlock rewards, bonus categories, sign-up promotions, and key exclusions.

Based on what you find AND the user profile above, return ONLY this JSON (no markdown fences, no extra text):
{
  "pros": [
    "<specific pro tied to their spending or life, max 12 words>",
    "<second pro>",
    "<third pro>"
  ],
  "cons": [
    "<specific con for their situation, max 12 words>",
    "<second con>"
  ],
  "verdict": "<2 sentences: should ${firstName} apply? Reference their SGD ${annual}/yr income and top spending categories.>"
}`,
    profile: 'stealth',
    onEvent: () => {},
    onDone: (ev) => {
      const raw = extractResultText(ev.result) || extractResultText(ev)
      try {
        const clean = raw.replace(/```json[\s\S]*?```/g, m => m.slice(7, -3))
                         .replace(/```/g, '')
                         .trim()
        // Find the JSON object in the response
        const match = clean.match(/\{[\s\S]*\}/)
        onDone?.(JSON.parse(match ? match[0] : clean))
      } catch {
        // Fallback: surface raw text as a verdict if JSON parse fails
        onDone?.({ pros: [], cons: [], verdict: raw })
      }
    },
    onError,
  })
}

// ─── Card verdict → markdown ───────────────────────────────────────────────

export function getCardVerdictAI({ cards, profile, apiKey, onChunk, onDone, onError, onEvent }) {
  const firstName = (profile.name || 'you').split(' ')[0]
  const totalSpend = ['dining_spend', 'grocery_spend', 'transport_spend', 'online_spend', 'petrol_spend']
    .reduce((s, k) => s + parseFloat(profile[k] || 0), 0)

  runAutomationSSE({
    url: 'https://www.mymoneysense.gov.sg',
    goal: `You are a Singapore personal finance expert giving a decisive credit card recommendation.

The web research has already been completed. The shortlisted cards and user profile are provided below — use this data to write your recommendation without browsing further.

${profileContext(profile)}

Cards already shortlisted for ${firstName} from prior web research:
${cards.map((c, i) => `${i + 1}. ${c.name} — ${c.bank} (${c.tag})`).join('\n')}

Based ONLY on the profile and card list above, pick the SINGLE best card using these EXACT ## headings:

## Our pick for ${firstName}: [Card Name] — [Bank]
[2–3 sentences explaining why this card wins for this person. Reference their actual spend numbers.]

**What you'll earn each month**
[Estimate monthly cashback/miles from their SGD ${totalSpend.toFixed(0)}/mo total spend. Show the maths.]

**Why this beats the others**
- [Specific reason vs runner-up]
- [Second reason]

**One thing to watch**
[Most important caveat for this specific user]

**Runner-up:** [Card] — [Bank] — consider if [one condition that would flip the pick]`,
    profile: 'stealth',
    onEvent: onEvent ?? (() => {}),
    onDone: (ev) => {
      const text = extractResultText(ev.result) || extractResultText(ev)
      onChunk?.(text, text)
      onDone?.(text)
    },
    onError,
  })
}

// ─── Card comparison → markdown ────────────────────────────────────────────

export function compareCardsAI({ cards, profile, apiKey, onChunk, onDone, onError, onEvent }) {
  const firstName = (profile.name || 'you').split(' ')[0]

  runAutomationSSE({
    url: 'https://www.mymoneysense.gov.sg',
    goal: `You are a Singapore personal finance expert ranking credit cards for a specific user.

The web research has already been completed. The shortlisted cards and user profile are provided below — use this data to write your ranking without browsing further.

${profileContext(profile)}

Cards shortlisted for ${firstName} from live web research:
${cards.map((c, i) => `${i + 1}. ${c.name} — ${c.bank} (${c.tag})`).join('\n')}

Rank ALL ${cards.length} cards from best to worst for this user. For each card use EXACTLY this format:

## [Rank]. [Card Name] — [Bank]
**Why it fits:** [one sentence referencing their actual profile numbers]
**Best for:** [which of their spending categories it covers]
**Downside:** [one specific con for this user]

End with:

**Bottom line:** [2 sentences: #1 recommendation + whether a 2-card combo makes sense for ${firstName}]`,
    profile: 'stealth',
    onEvent: onEvent ?? (() => {}),
    onDone: (ev) => {
      const text = extractResultText(ev.result) || extractResultText(ev)
      onChunk?.(text, text)
      onDone?.(text)
    },
    onError,
  })
}
