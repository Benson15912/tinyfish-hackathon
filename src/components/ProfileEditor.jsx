// components/ProfileEditor.jsx
import { useState } from 'react'
import { saveProfile } from '../lib/profile'

export function ProfileEditor({ profileMd, onUpdate, onClose }) {
  const [text, setText] = useState(profileMd)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    await saveProfile(text)
    onUpdate(text)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm z-50 flex items-center justify-end p-4">
      <div className="bg-white rounded-2xl w-full max-w-md h-full max-h-[90vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-cream-200">
          <div>
            <h3 className="font-medium text-ink-900">profile.md</h3>
            <p className="text-xs text-ink-400">Your personal data file</p>
          </div>
          <button onClick={onClose} className="text-ink-300 hover:text-ink-700 transition-colors text-lg">×</button>
        </div>

        <textarea
          className="flex-1 p-5 font-mono text-xs text-ink-700 bg-cream-50 resize-none focus:outline-none border-0"
          value={text}
          onChange={e => setText(e.target.value)}
          spellCheck={false}
        />

        <div className="px-5 py-4 border-t border-cream-200 flex gap-3">
          <button
            onClick={handleSave}
            className="flex-1 bg-ink-900 text-cream-50 rounded-xl py-2.5 text-sm font-medium hover:bg-ink-700 transition-colors"
          >
            {saved ? '✓ Saved' : 'Save changes'}
          </button>
          <button
            onClick={onClose}
            className="px-4 text-ink-500 text-sm hover:text-ink-900 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
