// lib/tinyfish.js
// Wraps the Tinyfish SSE streaming API.
// API key is read from VITE_TINYFISH_API_KEY in your .env file.

// In dev, route through the Vite proxy to avoid CORS issues.
// In production, call the API directly (Vite proxy isn't available).
const TINYFISH_BASE = import.meta.env.DEV
  ? '/api/tinyfish'
  : 'https://agent.tinyfish.ai'
const API_KEY = import.meta.env.VITE_TINYFISH_API_KEY

/**
 * Run a Tinyfish browser automation task with SSE streaming.
 *
 * @param {object} params
 * @param {string} params.url          - Target URL to automate
 * @param {string} params.goal         - Natural language task description
 * @param {string} [params.profile]    - 'lite' (default) or 'stealth'
 * @param {function} params.onEvent    - Called with each parsed SSE event object
 * @param {function} [params.onDone]   - Called when stream completes
 * @param {function} [params.onError]  - Called on error
 * @returns {AbortController}          - Call .abort() to cancel the stream
 */
export function runAutomationSSE({ url, goal, profile = 'stealth', onEvent, onDone, onError }) {
  const controller = new AbortController()

  ;(async () => {
    try {
      const res = await fetch(`${TINYFISH_BASE}/v1/automation/run-sse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify({
          url,
          goal,
          browser_profile: profile,
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const err = await res.text()
        onError?.(`Tinyfish error ${res.status}: ${err}`)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() // keep partial line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw || raw === '[DONE]') continue
          try {
            const event = JSON.parse(raw)
            // Normalise streaming URL — handle both dedicated event type and inline field
            if (event.type === 'STREAMING_URL' && event.streaming_url) {
              onEvent?.({ ...event })
            } else {
              onEvent?.(event)
            }
            if (event.type === 'COMPLETE') {
              if (event.status === 'FAILED' || event.status === 'CANCELLED') {
                const msg = event.help_message
                  ? `${event.error || event.status}: ${event.help_message} (${event.help_url || ''})`
                  : (event.error || event.status)
                onError?.(msg)
              } else {
                onDone?.(event)
              }
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        onError?.(err.message)
      }
    }
  })()

  return controller
}

/**
 * Extract readable text from a Tinyfish COMPLETE event's result field.
 * Returns [text, rawDump] — text for display, rawDump for debugging.
 */
export function extractResultText(obj) {
  if (!obj) return ''
  if (typeof obj === 'string') return obj
  // Try every plausible field name Tinyfish might use
  const candidates = [
    obj.output, obj.text, obj.content, obj.summary, obj.message,
    obj.answer, obj.response, obj.data, obj.result, obj.body,
    obj.completion, obj.generated_text, obj.markdown,
  ]
  for (const c of candidates) {
    if (c && typeof c === 'string' && c.trim().length > 0) return c
  }
  // One level deeper — e.g. ev.result.output
  if (obj.result && typeof obj.result === 'object') {
    const nested = extractResultText(obj.result)
    if (nested) return nested
  }
  // Last resort: full JSON so nothing is ever silently lost
  return JSON.stringify(obj, null, 2)
}

const val = (v, fallback = 'not provided') =>
  (!v || v === 'not-sure' || v === 'not sure') ? fallback : v

const PROFILE_SUMMARY = (p) => `
User profile:
- Name: ${val(p.name)}, Age: ${val(p.age)}, Citizenship: ${val(p.citizenship, 'SC')}, Ethnicity: ${val(p.ethnicity)}
- Relationship: ${val(p.relationship_status, 'single')}, Housing: ${val(p.housing_status, 'living-with-parents')}, Children: ${p.has_children || 'false'}
- Employment: ${val(p.employment_type, 'full-time')} at ${val(p.employer)}
- Monthly income: SGD ${val(p.income_monthly)} (annual: SGD ${(parseFloat(p.income_monthly || 0) * 12).toFixed(0)})
- Monthly savings target: SGD ${val(p.savings_monthly)}
- Credit history: ${val(p.credit_history, 'good')}, Has existing credit card: ${p.has_existing_credit_card || 'false'}
- Transport mode: ${val(p.transport_mode, 'public-transport')}
- Monthly spending: dining SGD ${val(p.dining_spend)}, grocery SGD ${val(p.grocery_spend)}, transport SGD ${val(p.transport_spend)}, petrol SGD ${p.petrol_spend || '0'}, online SGD ${val(p.online_spend)}, entertainment SGD ${val(p.entertainment_spend)}, bills SGD ${val(p.monthly_bills_spend)}
- Dining style: ${val(p.dining_preference, 'mixed')}
- Frequent merchants: ${p.frequent_merchants || 'Grab, Shopee, NTUC FairPrice'}
- Travel frequency: ${val(p.travel_frequency, 'occasionally')}
- Preferred rewards: ${val(p.preferred_rewards, 'cashback')}
- Willing to pay annual fee: ${val(p.willing_annual_fee, 'no')}
- Primary card goal: ${val(p.card_primary_goal)}
- Risk tolerance: ${val(p.risk_tolerance)}
- Existing debt: ${val(p.existing_debt, 'none')}
- Emergency fund: ${val(p.emergency_fund)}
- Big purchase next 12 months: ${val(p.big_purchase_next_year, 'none')}
- Invests: ${val(p.has_investments)}${p.investment_type && p.investment_type !== 'not-sure' ? ` via ${p.investment_type}` : ''}
`.trim()

/**
 * Search the web broadly and return a single decisive credit card verdict.
 */
export function getCardVerdict({ profile, onEvent, onDone, onError }) {
  const goal = `
You are helping a Singapore resident decide on ONE credit card to apply for.

${PROFILE_SUMMARY(profile)}

Research Singapore credit cards by browsing these sites in order:
1. https://www.moneysmart.sg/credit-cards — check all listed cards and current promotions
2. https://www.singsaver.com.sg/credit-cards — check for any exclusive sign-up deals
3. Check the top banks directly if needed: dbs.com.sg, ocbc.com, uob.com.sg, citibank.com.sg, sc.com/sg, maybank.com.sg, cimb.com.sg

Look at actual current offers, cashback rates, annual fee waivers, income requirements, and sign-up bonuses.

After browsing, write a personalised verdict using EXACTLY this format (use ## headings):

## Our pick: [Full Card Name] — [Bank]
[2–3 sentences explaining why this card wins for this person, referencing their actual spend amounts.]

**What you'll earn each month**
[Calculate estimated monthly cashback or miles based on their specific spending. Show the maths: e.g. "SGD 400 dining × 5% = SGD 20".]

**Why this beats the alternatives**
- [Specific reason a competing card loses for this person]
- [Another specific reason]

**One thing to watch**
[Single most important caveat — fee waiver threshold, minimum spend, etc.]

**Also consider** [Runner-up card name] — [Bank] if [one specific condition that would flip the recommendation]

Do not hedge. Make a definitive call. Use the user's actual numbers.
  `.trim()

  return runAutomationSSE({ url: 'https://www.moneysmart.sg/credit-cards', goal, profile: 'stealth', onEvent, onDone, onError })
}

/**
 * Search the web broadly and return a ranked comparison of the top 3 cards.
 */
export function getCardComparison({ profile, onEvent, onDone, onError }) {
  const goal = `
You are helping a Singapore resident compare credit cards.

${PROFILE_SUMMARY(profile)}

Research Singapore credit cards by browsing:
1. https://www.moneysmart.sg/credit-cards — comparison and current promotions
2. https://www.singsaver.com.sg/credit-cards — additional deals
3. Individual bank pages as needed: DBS, OCBC, UOB, Citibank, Standard Chartered, CIMB, Maybank

Find the top 3 cards that best match this person's income, spending habits, and preferences. Check for current sign-up offers.

Return your answer using EXACTLY this format:

## 1. [Card Name] — [Bank]
**Why it fits you:** [one sentence using their actual profile data]
**Best for:** [spending category]
**Key benefit:** [main perk with specific rate or amount]
**Current offer:** [sign-up bonus or promotion if any, else "None"]
**Annual fee:** [fee and waiver condition]
**Income req:** SGD [minimum annual income]

## 2. [Card Name] — [Bank]
[same fields]

## 3. [Card Name] — [Bank]
[same fields]

**Tip:** [one-line watchout that applies across all three]
  `.trim()

  return runAutomationSSE({ url: 'https://www.moneysmart.sg/credit-cards', goal, profile: 'stealth', onEvent, onDone, onError })
}

/**
 * Browse HDB website and return personalised BTO guidance for the user.
 */
export function getBTOGuidance({ profile, onEvent, onDone, onError }) {
  const goal = `
Go to https://www.hdb.gov.sg/residential/buying-a-flat

You are an HDB BTO expert helping a Singapore resident understand their BTO journey. Their profile:
- Age: ${profile.age || 'unknown'}, Citizenship: ${profile.citizenship || 'SC'}, Ethnicity: ${profile.ethnicity || 'unknown'}
- Monthly income: SGD ${profile.income_monthly || 'unknown'}
- CPF OA balance: SGD ${profile.cpf_oa_balance || 'unknown'}
- Flat type interested in: ${profile.flat_type_applying || '4-room'}
- Preferred towns: ${profile.preferred_towns || 'Tengah'}
- Employment: ${profile.employment_type || 'full-time'}, Employer: ${profile.employer || 'unknown'}

Browse the HDB website for information on BTO eligibility, grants, and the application process.

Provide personalised guidance in this exact format:

## Your eligibility
[One paragraph on whether they qualify and under which scheme. Be specific about their citizenship and age.]

## Grants you likely qualify for
[List 2–3 grants with estimated amounts based on their actual income figure — CPF Housing Grant, EHG, PHG, etc.]

## Your next step right now
[One concrete action they should take today — be specific about what to click or do.]

## Watch out for
[One key thing specific to their situation — income ceiling, ethnic quota, etc.]
  `.trim()

  return runAutomationSSE({ url: 'https://www.hdb.gov.sg/residential/buying-a-flat', goal, profile: 'stealth', onEvent, onDone, onError })
}

/**
 * Browse the web and generate a personalised card list from scratch for the user.
 * Returns an array of {name, bank, tag, url, pros, cons, verdict} objects — no seed list needed.
 */
export function personaliseCardList({ profile, onEvent, onDone, onError }) {
  const firstName = (profile.name || 'the user').split(' ')[0]
  const annualIncome = (parseFloat(profile.income_monthly || 0) * 12).toFixed(0)

  const goal = `
You are a Singapore personal finance expert. Research and find the best credit cards for this specific user.

${PROFILE_SUMMARY(profile)}

Browse these sites to find currently available Singapore credit cards:
1. https://www.moneysmart.sg/credit-cards
2. https://www.singsaver.com.sg/credit-cards
3. Check individual bank pages as needed: dbs.com.sg, ocbc.com, uob.com.sg, citibank.com.sg, sc.com/sg, hsbc.com.sg, maybank2u.com.sg, cimb.com.sg, americanexpress.com/en-sg, trustbank.sg

Find the 6 best credit cards for this user and rank them from best (#1) to worst (#6). Consider:
1. Income eligibility — only include cards the user qualifies for (annual income: SGD ${annualIncome})
2. Reward type — preference is ${val(profile.preferred_rewards, 'cashback')}
3. Top spending categories: dining SGD ${val(profile.dining_spend, '0')}/mo, online SGD ${val(profile.online_spend, '0')}/mo, transport SGD ${val(profile.transport_spend, '0')}/mo, grocery SGD ${val(profile.grocery_spend, '0')}/mo, bills SGD ${val(profile.monthly_bills_spend, '0')}/mo
4. Annual fee — user ${!profile.willing_annual_fee || profile.willing_annual_fee === 'no' ? 'prefers no annual fee or waivable fee' : 'is open to paying annual fee if justified'}
5. Travel — user travels ${val(profile.travel_frequency, 'occasionally')}
6. Primary goal — ${val(profile.card_primary_goal, 'not specified')}
7. Existing debt: ${val(profile.existing_debt, 'none')} · Emergency fund: ${val(profile.emergency_fund)} · Big purchase soon: ${val(profile.big_purchase_next_year, 'none')}

For each card, research the actual card page to find real cashback/miles rates, minimum spend, annual fee, and income requirements.

Return ONLY a valid JSON array of exactly 6 objects ordered from rank 1 (best fit) to rank 6, with these fields:
- rank: integer 1–6
- name: full official card name
- bank: issuing bank name
- tag: short reason this ranks here for ${firstName} (max 6 words, e.g. "Best for your dining spend")
- url: direct URL to the card's product or application page
- pros: array of exactly 3 strings — specific pros for ${firstName} referencing their actual spending numbers (max 15 words each)
- cons: array of exactly 2 strings — specific cons for ${firstName}'s situation (max 15 words each)
- verdict: one sentence — should ${firstName} apply? Reference their SGD ${annualIncome}/yr income

Output the JSON array only. No markdown fences, no explanation, no extra text.
  `.trim()

  return runAutomationSSE({ url: 'https://www.moneysmart.sg/credit-cards', goal, profile: 'stealth', onEvent, onDone, onError })
}

/**
 * Scrape HDB for current BTO launches and return a ranked, personalised list.
 * Returns an array of {rank, name, town, flat_types, price_from, price_to,
 *   completion_estimate, url, tag, pros, cons, reasoning} objects.
 */
export function getBTOProjects({ profile, onEvent, onDone, onError }) {
  const firstName = (profile.name || 'the user').split(' ')[0]
  const annualIncome = (parseFloat(profile.income_monthly || 0) * 12).toFixed(0)
  const preferredTowns = val(profile.preferred_towns, 'any')
  const flatType = val(profile.flat_type_applying, '4-room')

  const goal = `
You are an HDB BTO expert helping a Singapore resident find the best available BTO flat.

${PROFILE_SUMMARY(profile)}

KEY PREFERENCE: ${firstName}'s top priority is a project in or near "${preferredTowns}". Projects in this town or adjacent towns should rank significantly higher than equally-priced projects elsewhere, all else being equal.

Browse the HDB BTO listings to find ALL currently available BTO projects:
1. https://www.hdb.gov.sg/residential/buying-a-flat/finding-a-flat/new-flats/bto-and-sleb
2. https://homes.hdb.gov.sg/home/findBTOFlats (if available)

For each available project, check:
- Project name and town/location
- Available flat types and their price ranges
- Estimated completion / key collection date
- Application period (if open)
- Proximity to MRT, amenities, schools
- Direct URL to the project page

Rank ALL projects from best (#1) to worst for ${firstName} using this priority order:
1. LOCATION MATCH (highest weight) — projects in "${preferredTowns}" rank first; adjacent towns second; further towns last
2. FLAT TYPE MATCH — must offer ${flatType}; projects without it rank lower
3. INCOME FIT — price range must be achievable on SGD ${annualIncome}/yr income + CPF OA SGD ${val(profile.cpf_oa_balance, 'unknown')}
4. SCHEME ELIGIBILITY — relationship status: ${val(profile.relationship_status, 'single')} affects which schemes apply
5. COMPLETION TIMING — earlier completion ranks higher unless user has a specific timeline need

Return ONLY a valid JSON array ordered from rank 1 (best) to worst, each object with:
- rank: integer starting at 1
- name: full project name
- town: town/estate name (e.g. "Tengah", "Punggol", "Woodlands")
- flat_types: array of available flat type strings (e.g. ["3-room", "4-room", "5-room"])
- price_from: lowest price in SGD as integer (for the flat type most relevant to ${firstName})
- price_to: highest price in SGD as integer
- completion_estimate: estimated year of completion (e.g. "2029")
- url: direct URL to the project page on HDB website
- tag: short personalised reason this ranks here (max 8 words)
- pros: array of 3 strings — specific pros for ${firstName} (max 15 words each)
- cons: array of 2 strings — specific cons for ${firstName}'s situation (max 15 words each)
- reasoning: one sentence explaining why it ranks where it does for ${firstName}

Output the JSON array only. No markdown fences, no explanation, no extra text.
  `.trim()

  return runAutomationSSE({
    url: 'https://www.hdb.gov.sg/residential/buying-a-flat/finding-a-flat/new-flats/bto-and-sleb',
    goal,
    profile: 'stealth',
    onEvent,
    onDone,
    onError,
  })
}

/**
 * Browse a card's product page and return a personalised pros/cons breakdown.
 */
export function getCardBreakdown({ card, profile, onEvent, onDone, onError }) {
  const firstName = (profile.name || 'the user').split(' ')[0]
  const annualIncome = (parseFloat(profile.income_monthly || 0) * 12).toFixed(0)

  const goal = `
Go to ${card.url}

You are a Singapore personal finance expert analysing the ${card.name} (${card.bank}) credit card for a specific user.

${PROFILE_SUMMARY(profile)}

Browse the card's product page thoroughly. Look for:
- Annual fee and exact waiver conditions
- Minimum income requirement
- All cashback or miles earning rates and their spending categories
- Minimum monthly spend to unlock rewards
- Bonus categories and caps
- Current sign-up promotions or welcome gifts
- Key exclusions (e.g. excluded merchants, categories that don't earn)
- Any supplementary card benefits

Then write a personalised analysis using EXACTLY this format:

## ${card.name} — ${card.bank}

**At a glance**
- Annual fee: [fee and waiver condition]
- Min. income: SGD [amount] per year
- Key earn rate: [primary cashback % or mpd]
- Min. monthly spend: [amount or "none"]
- Sign-up offer: [current offer or "none"]

**Pros for ${firstName}**
- [Pro directly tied to their profile — e.g. "Your SGD ${profile.dining_spend || '?'}/mo dining spend earns X% here"]
- [Second pro specific to their situation]
- [Third pro — could relate to their transport mode, relationship status, frequent merchants, etc.]

**Cons for ${firstName}**
- [Con specific to their situation — e.g. income eligibility, min spend vs their total, fee structure]
- [Second con]

**Is it worth it for ${firstName}?**
[2–3 sentences: direct verdict on whether ${firstName} should apply given their SGD ${annualIncome}/yr income, ${profile.preferred_rewards || 'cashback'} preference, and spending patterns. Be specific — reference their numbers.]
  `.trim()

  return runAutomationSSE({ url: card.url, goal, profile: 'stealth', onEvent, onDone, onError })
}

/**
 * Answer any personal finance or adulting question for a Singapore resident.
 * Tinyfish browses relevant Singapore government and financial sites to research the answer.
 */
export function askAdulting({ question, profile, onEvent, onDone, onError }) {
  const goal = `
${PROFILE_SUMMARY(profile)}

Answer this question for the user above: "${question}"

Research by browsing relevant Singapore websites — MAS (mas.gov.sg), MoneySense (mymoneysense.gov.sg), CPF (cpf.gov.sg), HDB (hdb.gov.sg), IRAS (iras.gov.sg), MoneySmart (moneysmart.sg), SingSaver (singsaver.com.sg), and any bank or government page relevant to the question.

Give a comprehensive, personalised answer that:
- Is specific to Singapore laws, schemes, and products
- References actual websites, tools, or services by name with direct URLs
- Mentions exact dollar amounts, percentages, or thresholds where relevant to their profile numbers
- Gives 3–5 concrete next steps
- Uses ## headings and bullet points for clarity
- Is written in a friendly, practical tone for a young Singaporean adult

Be specific and actionable. Reference their actual profile numbers (income, age, citizenship, etc.) where relevant.
`.trim()

  return runAutomationSSE({
    url: 'https://www.mymoneysense.gov.sg',
    goal,
    profile: 'stealth',
    onEvent,
    onDone,
    onError,
  })
}

/**
 * Research HDB and CPF grants this user is eligible for.
 * Returns a structured breakdown with amounts and eligibility conditions.
 */
export function getGrantEligibility({ profile, onEvent, onDone, onError }) {
  const annualIncome = (parseFloat(profile.income_monthly || 0) * 12).toFixed(0)

  const goal = `
You are an HDB grants expert. Research grant eligibility for this Singapore resident:
- Age: ${profile.age || 'unknown'}, Citizenship: ${profile.citizenship || 'SC'}, Ethnicity: ${profile.ethnicity || 'unknown'}
- Relationship status: ${profile.relationship_status || 'single'}
- Monthly income: SGD ${profile.income_monthly || 'unknown'} (annual: SGD ${annualIncome})
- Flat type interested in: ${profile.flat_type_applying || '4-room'}
- Preferred towns: ${profile.preferred_towns || 'Tengah'}
- CPF OA balance: SGD ${profile.cpf_oa_balance || 'unknown'}
- Housing status: ${profile.housing_status || 'living-with-parents'}

Browse these pages to get current grant amounts:
1. https://www.hdb.gov.sg/cs/infoweb/residential/buying-a-flat/understanding-your-eligibility-and-housing-loan-options/flat-and-grant-eligibility
2. https://www.hdb.gov.sg/residential/buying-a-flat/understanding-your-eligibility-and-housing-loan-options/cpf-housing-grants-for-hdb-flats/firsttimer-applicants

Check eligibility for: Enhanced Housing Grant (EHG), CPF Housing Grant (CHG/AHG/SHG), Proximity Housing Grant (PHG), Step-Up CPF Housing Grant, and any other applicable grants.

Return your answer in EXACTLY this format:

## Grants you qualify for
| Grant | Amount | Key condition |
|-------|--------|---------------|
[one row per grant, using actual amounts from HDB website]

## Your total grant entitlement
**Up to SGD [total]** towards your ${profile.flat_type_applying || '4-room'} flat

## Grants you're close to but don't currently qualify for
[bullet list — what you'd need to change to qualify]

## How to maximise your grants
[3 bullet points with specific, actionable advice]

## Your buying power estimate
CPF OA (SGD ${profile.cpf_oa_balance || '?'}) + grants (SGD [total]) = **SGD [combined] available** for down payment and purchase.
`.trim()

  return runAutomationSSE({
    url: 'https://www.hdb.gov.sg/cs/infoweb/residential/buying-a-flat/understanding-your-eligibility-and-housing-loan-options/flat-and-grant-eligibility',
    goal,
    profile: 'stealth',
    onEvent,
    onDone,
    onError,
  })
}

/**
 * Build a credit card autofill task string from a parsed profile object.
 */
export function buildCardAutofillTask(profile, cardUrl) {
  return `
Go to ${cardUrl}.

Fill in the credit card application form using these details:
- Full name: ${profile.name || 'not provided'}
- NRIC/FIN: ${profile.nric || 'not provided'}
- Date of birth: ${profile.dob || 'not provided'}
- Mobile number: ${profile.phone || 'not provided'}
- Email address: ${profile.email || 'not provided'}
- Residential address: ${profile.address || 'not provided'}
- Employment type: ${profile.employment_type || 'not provided'}
- Employer name: ${profile.employer || 'not provided'}
- Annual income: ${profile.income_annual || 'not provided'}
- Citizenship: ${profile.citizenship || 'Singapore Citizen'}

Fill every visible field that matches the above information.
If a field is not in the list above, leave it blank.
Do NOT click any Submit, Confirm, Apply, or Proceed button.
Stop immediately if you encounter a SingPass login, MyInfo, OTP, or 2FA step.
Take a screenshot of the filled form before stopping.
Report which fields were filled and which could not be matched.
  `.trim()
}

/**
 * Build a BTO application autofill task string from a parsed profile object.
 */
export function buildBTOAutofillTask(profile, btoUrl) {
  return `
Go to ${btoUrl}.

This is an HDB BTO flat application form.
Fill in the form using these details:
- Applicant full name: ${profile.name || 'not provided'}
- NRIC: ${profile.nric || 'not provided'}
- Date of birth: ${profile.dob || 'not provided'}
- Contact number: ${profile.phone || 'not provided'}
- Email address: ${profile.email || 'not provided'}
- Residential address: ${profile.address || 'not provided'}
- Citizenship: ${profile.citizenship || 'SC'}
- Ethnic group: ${profile.ethnicity || 'not provided'}
- Flat type applying for: ${profile.flat_type_applying || '4-room'}
- First choice town: ${(profile.preferred_towns || ['Tengah'])[0]}

Fill all fields you can match from the above.
Do NOT click Submit, Confirm, or any final application button.
Stop immediately if you see a SingPass login, MyInfo portal, OTP, or 2FA screen.
Take a screenshot of the filled state before stopping.
List which fields were filled and which required information was missing.
  `.trim()
}
