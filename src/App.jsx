// App.jsx
import { useState, useEffect } from 'react'
import { loadProfile, saveProfile, parseProfile } from './lib/profile'
import { getStoredApiKey } from './lib/openai'
import { Onboarding } from './components/Onboarding'
import { CardModule } from './components/CardModule'
import { BTOModule } from './components/BTOModule'
import { AskModule } from './components/AskModule'
import { ProfileEditor } from './components/ProfileEditor'

const TABS = [
  { id: 'cards', label: 'Credit cards', icon: '💳' },
  { id: 'bto', label: 'BTO journey', icon: '🏠' },
  { id: 'ask', label: 'Ask anything', icon: '✦' },
]

export default function App() {
  const [profileMd, setProfileMd] = useState(null)
  const [onboarded, setOnboarded] = useState(false)
  const [tab, setTab] = useState('cards')
  const [showProfile, setShowProfile] = useState(false)
  const apiKey = getStoredApiKey()

  useEffect(() => {
    loadProfile().then(md => {
      setProfileMd(md)
      const hasName = md.includes('name: "') && !md.includes('name: ""')
      setOnboarded(hasName)
    })
  }, [])

  function handleOnboardingComplete(updatedMd) {
    setProfileMd(updatedMd)
    setOnboarded(true)
  }

  function handleProfileUpdate(updatedMd) {
    setProfileMd(updatedMd)
  }

  if (profileMd === null) {
    return null // loading
  }

  if (!onboarded) {
    return <Onboarding profileMd={profileMd} onComplete={handleOnboardingComplete} />
  }

  const profile = parseProfile(profileMd)
  const firstName = profile.name ? profile.name.split(' ')[0] : 'there'
  const greetingHour = new Date().getHours()
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 18 ? 'Good afternoon' : 'Good evening'

  const statChips = [
    profile.citizenship && { label: profile.citizenship },
    profile.age && { label: `Age ${profile.age}` },
    profile.income_monthly && { label: `SGD ${parseInt(profile.income_monthly).toLocaleString()}/mo` },
    profile.relationship_status && { label: profile.relationship_status },
    profile.housing_status && { label: profile.housing_status.replace(/-/g, ' ') },
    profile.transport_mode && { label: profile.transport_mode.replace(/-/g, ' ') },
  ].filter(Boolean)

  return (
    <div className="min-h-screen bg-cream-50">

      {/* Top nav */}
      <header className="border-b border-cream-200 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-display text-xl text-ink-900">adulting<span className="text-sage-500">.sg</span></span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-1.5 text-xs text-ink-500 border border-cream-200 rounded-lg px-3 py-1.5 hover:border-ink-300 transition-colors"
            >
              <span className="font-mono text-ink-400">{'{}'}</span>
              profile.md
            </button>
          </div>
        </div>
      </header>

      {/* Hero — fully personalised */}
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-6">
        <p className="text-sm text-ink-400 mb-1">{greeting}, {firstName}</p>
        <h1 className="font-display text-3xl text-ink-900 mb-3">
          Your adulting <em>guide</em>
        </h1>
        {statChips.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {statChips.map((chip, i) => (
              <span key={i} className="text-xs bg-white border border-cream-200 text-ink-500 rounded-full px-3 py-1 capitalize">
                {chip.label}
              </span>
            ))}
          </div>
        )}
        <p className="text-ink-400 text-sm">
          Personalised credit card picks and BTO roadmap for {profile.name || 'you'}.
        </p>
      </div>

      {/* Tabs */}
      <div className="max-w-2xl mx-auto px-4 mb-6">
        <div className="flex bg-cream-100 rounded-xl p-1 gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all
                ${tab === t.id
                  ? 'bg-white text-ink-900 shadow-sm'
                  : 'text-ink-400 hover:text-ink-700'}`}
            >
              <span style={{ fontSize: '14px' }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 pb-16 animate-fade-up">
        {tab === 'cards' && <CardModule profileMd={profileMd} apiKey={apiKey} />}
        {tab === 'bto' && <BTOModule profileMd={profileMd} />}
        {tab === 'ask' && <AskModule profileMd={profileMd} />}
      </main>

      {/* Profile editor modal */}
      {showProfile && (
        <ProfileEditor
          profileMd={profileMd}
          onUpdate={handleProfileUpdate}
          onClose={() => setShowProfile(false)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-cream-200 py-6">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-between">
          <p className="text-xs text-ink-300">adulting.sg — built for Singapore young adults</p>
          <button
            onClick={() => {
              if (window.confirm('Reset profile and start over?')) {
                localStorage.clear()
                window.location.reload()
              }
            }}
            className="text-xs text-ink-300 hover:text-ink-600 transition-colors"
          >
            Reset profile
          </button>
        </div>
      </footer>
    </div>
  )
}
