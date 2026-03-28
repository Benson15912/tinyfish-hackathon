// components/Onboarding.jsx
import { useState } from 'react'
import { updateProfileField, saveProfile } from '../lib/profile'

const STEPS = [
  {
    id: 'basics',
    title: 'Let\'s get to know you',
    subtitle: 'Your basic details help us personalise everything.',
    fields: [
      { key: 'name', label: 'Full name (as per NRIC)', type: 'text', placeholder: 'Tan Mei Ling' },
      { key: 'age', label: 'Age', type: 'number', placeholder: '24' },
      { key: 'citizenship', label: 'Citizenship', type: 'select', options: ['SC', 'PR', 'Foreigner'] },
      { key: 'ethnicity', label: 'Ethnic group', type: 'select', options: ['Chinese', 'Malay', 'Indian', 'Others'] },
    ]
  },
  {
    id: 'income',
    title: 'Your income',
    subtitle: 'This determines which cards and grants you qualify for.',
    fields: [
      { key: 'income_monthly', label: 'Monthly income (SGD)', type: 'number', placeholder: '3500' },
      { key: 'employment_type', label: 'Employment type', type: 'select', options: ['full-time', 'part-time', 'self-employed', 'student', 'unemployed'] },
      { key: 'employer', label: 'Employer (optional)', type: 'text', placeholder: 'Shopee Singapore' },
    ]
  },
  {
    id: 'spending',
    title: 'How do you spend?',
    subtitle: 'The more detail you give, the sharper the recommendation.',
    fields: [
      { key: 'dining_spend', label: 'Monthly dining spend (SGD)', type: 'number', placeholder: '400' },
      { key: 'grocery_spend', label: 'Monthly grocery spend (SGD)', type: 'number', placeholder: '200' },
      { key: 'transport_spend', label: 'Monthly transport spend (SGD)', type: 'number', placeholder: '150' },
      { key: 'petrol_spend', label: 'Monthly petrol spend (SGD, 0 if none)', type: 'number', placeholder: '0' },
      { key: 'online_spend', label: 'Monthly online shopping spend (SGD)', type: 'number', placeholder: '200' },
      { key: 'travel_frequency', label: 'How often do you travel overseas?', type: 'select', options: ['rarely', 'occasionally (1–2x/year)', 'frequently (3+/year)'] },
      { key: 'preferred_rewards', label: 'What matters most to you?', type: 'select', options: ['cashback', 'air miles', 'rewards points', 'no preference'] },
      { key: 'willing_annual_fee', label: 'Willing to pay annual fee?', type: 'select', options: ['no', 'yes if benefits outweigh cost'] },
    ]
  },
  {
    id: 'lifestyle',
    title: 'Your lifestyle',
    subtitle: 'Helps us match cards and advice to how you actually live.',
    fields: [
      { key: 'relationship_status', label: 'Relationship status', type: 'select', options: ['single', 'in a relationship', 'engaged', 'married'] },
      { key: 'housing_status', label: 'Current housing', type: 'select', options: ['living-with-parents', 'renting', 'own-home'] },
      { key: 'transport_mode', label: 'Main way you get around', type: 'select', options: ['public-transport', 'private-car', 'grab-taxi', 'cycling', 'mixed'] },
      { key: 'dining_preference', label: 'Dining style', type: 'select', options: ['mostly-hawker', 'casual-dining', 'fine-dining', 'mixed'] },
      { key: 'entertainment_spend', label: 'Monthly entertainment (SGD)', type: 'number', placeholder: '100' },
      { key: 'savings_monthly', label: 'Monthly savings target (SGD)', type: 'number', placeholder: '500' },
    ]
  },
  {
    id: 'goals',
    title: 'Your financial goals',
    subtitle: 'Helps the AI pick cards that actually match what you want your money to do.',
    fields: [
      {
        key: 'card_primary_goal',
        label: 'What do you mainly want from a credit card?',
        type: 'select',
        options: ['cashback on daily spend', 'air miles for travel', 'rewards points', 'shopping & online discounts', 'travel perks & lounges', 'no preference'],
      },
      {
        key: 'monthly_bills_spend',
        label: 'Monthly bills spend — utilities, phone, subscriptions (SGD)',
        type: 'number',
        placeholder: '150',
      },
      {
        key: 'risk_tolerance',
        label: 'Investment risk appetite',
        type: 'select',
        options: ['conservative — preserve capital', 'moderate — balanced growth', 'aggressive — maximise returns'],
      },
      {
        key: 'existing_debt',
        label: 'Any existing debt?',
        type: 'select',
        options: ['none', 'student loan', 'car loan', 'personal loan', 'home loan', 'multiple loans'],
      },
      {
        key: 'emergency_fund',
        label: 'Emergency fund (months of expenses saved)',
        type: 'select',
        options: ['none', 'less than 1 month', '1–3 months', '3–6 months', '6+ months'],
      },
      {
        key: 'big_purchase_next_year',
        label: 'Big purchase planned in the next 12 months?',
        type: 'select',
        options: ['none', 'renovation', 'car', 'wedding', 'overseas holiday', 'electronics / gadgets', 'other'],
      },
      {
        key: 'has_investments',
        label: 'Do you currently invest?',
        type: 'select',
        options: ['yes', 'no — but interested', 'no'],
      },
      {
        key: 'investment_type',
        label: 'If yes, what do you invest in?',
        type: 'select',
        options: ['stocks & ETFs', 'crypto', 'robo-advisor (StashAway, Syfe etc.)', 'SSBs & fixed deposits', 'CPF top-ups only', 'mixed'],
      },
    ],
  },
  {
    id: 'bto',
    title: 'BTO plans?',
    subtitle: 'Tell us about your housing goals.',
    fields: [
      { key: 'flat_type_applying', label: 'Flat type', type: 'select', options: ['2-room Flexi', '3-room', '4-room', '5-room', 'Executive'] },
      { key: 'preferred_towns', label: 'Preferred town (first choice)', type: 'text', placeholder: 'Tengah' },
      { key: 'cpf_oa_balance', label: 'CPF OA balance approx. (SGD)', type: 'number', placeholder: '8000' },
    ]
  },
]

export function Onboarding({ profileMd, onComplete }) {
  const [step, setStep] = useState(0)
  const [values, setValues] = useState({})
  const current = STEPS[step]

  function handleChange(key, val) {
    setValues(v => ({ ...v, [key]: val }))
  }

  async function handleNext() {
    // Apply all collected values to profile markdown
    let updated = profileMd
    for (const [k, v] of Object.entries(values)) {
      updated = updateProfileField(updated, k, v)
    }
    await saveProfile(updated)

    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      onComplete(updated)
    }
  }

  const progress = ((step) / STEPS.length) * 100

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-ink-300 font-mono mb-2">
            <span>Step {step + 1} of {STEPS.length}</span>
            <span>{STEPS[step].id}</span>
          </div>
          <div className="h-1 bg-cream-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-sage-500 rounded-full transition-all duration-500"
              style={{ width: `${progress + (100 / STEPS.length)}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="bg-white border border-cream-200 rounded-2xl p-8 shadow-sm">
          <h2 className="font-display text-2xl text-ink-900 mb-1">{current.title}</h2>
          <p className="text-ink-500 text-sm mb-7">{current.subtitle}</p>

          <div className="space-y-4">
            {current.fields.map(field => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-ink-500 mb-1.5 uppercase tracking-wide">
                  {field.label}
                </label>
                {field.type === 'select' ? (
                  <select
                    className="w-full border border-cream-200 rounded-xl px-4 py-3 text-ink-900 bg-cream-50 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm"
                    value={values[field.key] || ''}
                    onChange={e => handleChange(field.key, e.target.value)}
                  >
                    <option value="">Select…</option>
                    {field.options.map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                    <option value="not-sure">Not sure / prefer not to say</option>
                  </select>
                ) : (
                  <div>
                    <input
                      type={values[field.key] === 'not-sure' ? 'text' : field.type}
                      placeholder={values[field.key] === 'not-sure' ? 'skipped' : field.placeholder}
                      disabled={values[field.key] === 'not-sure'}
                      className="w-full border border-cream-200 rounded-xl px-4 py-3 text-ink-900 bg-cream-50 focus:outline-none focus:ring-2 focus:ring-sage-400 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                      value={values[field.key] === 'not-sure' ? '' : (values[field.key] || '')}
                      onChange={e => handleChange(field.key, e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => handleChange(field.key, values[field.key] === 'not-sure' ? '' : 'not-sure')}
                      className="mt-1.5 text-xs text-ink-300 hover:text-ink-500 transition-colors"
                    >
                      {values[field.key] === 'not-sure' ? '↩ Enter a value' : 'Not sure — skip this'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleNext}
            className="mt-8 w-full bg-ink-900 text-cream-50 rounded-xl py-3.5 font-medium text-sm hover:bg-ink-700 transition-colors"
          >
            {step < STEPS.length - 1 ? 'Continue →' : 'Done — show me results'}
          </button>

          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="mt-3 w-full text-ink-400 text-sm hover:text-ink-700 transition-colors"
            >
              ← Back
            </button>
          )}
        </div>

        <p className="text-center text-xs text-ink-300 mt-4">
          Your data stays on your device. Nothing is stored on our servers.
        </p>
      </div>
    </div>
  )
}
