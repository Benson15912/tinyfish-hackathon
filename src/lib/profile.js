// lib/profile.js
// Reads/writes the user's profile.md to disk via the Vite dev server API.

export const DEFAULT_PROFILE = `---
name: ""
age: ""
nric: ""
dob: ""
phone: ""
email: ""
address: ""
citizenship: SC
ethnicity: ""

# Employment & income
income_monthly: ""
income_annual: ""
employment_type: full-time
employer: ""
employment_start: ""

# Financial snapshot
cpf_oa_balance: ""
savings_monthly: ""
insurance_monthly: ""
existing_loans: false
credit_history: good
has_existing_credit_card: false
existing_cards: []

# Monthly spending
dining_spend: ""
grocery_spend: ""
transport_spend: ""
petrol_spend: "0"
online_spend: ""
entertainment_spend: ""
shopping_spend: ""

# Lifestyle
relationship_status: single
has_children: false
number_of_children: 0
housing_status: living-with-parents
transport_mode: public-transport
dining_preference: mixed
frequent_merchants:
  - Grab
  - Shopee
  - NTUC FairPrice

# Card preferences
travel_frequency: occasionally
preferred_rewards: cashback
willing_annual_fee: false
priorities:
  - cashback

# Financial goals
card_primary_goal: ""
monthly_bills_spend: ""
risk_tolerance: ""
existing_debt: none
emergency_fund: ""
big_purchase_next_year: none
has_investments: ""
investment_type: ""

# BTO
bto_interest: true
flat_type_applying: 4-room
preferred_towns:
  - Tengah

autofill_consented: false
---
`

export async function loadProfile() {
  const res = await fetch('/api/profile')
  const { content } = await res.json()
  return content || DEFAULT_PROFILE
}

export async function saveProfile(markdown) {
  await fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: markdown }),
  })
}

// Parse YAML frontmatter into a plain object for easy field access
export function parseProfile(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}
  const yaml = match[1]
  const result = {}
  for (const line of yaml.split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/)
    if (kv) {
      const key = kv[1]
      let val = kv[2].trim()
      // Strip surrounding quotes (both "" and '')
      if ((val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      result[key] = val
    }
  }
  return result
}

// Update a single key in the YAML frontmatter
export function updateProfileField(markdown, key, value) {
  const updated = markdown.replace(
    new RegExp(`(^${key}:\\s*)(.*)`, 'm'),
    `$1"${value}"`
  )
  return updated
}
