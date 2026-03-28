# adulting.sg

A personalised credit card recommender and BTO application guide for Singapore young adults.
Built with React + Tailwind + Claude API + Tinyfish browser automation.

---

## Setup (5 minutes)

### 1. Install dependencies
```bash
cd adulting-sg
npm install
```

### 2. Add your API keys
Open `.env` and replace the placeholder values:

```env
VITE_TINYFISH_API_KEY=your_tinyfish_key_here
VITE_ANTHROPIC_API_KEY=your_anthropic_key_here
```

- **Tinyfish key** → https://agent.tinyfish.ai/api-keys
- **Anthropic key** → https://console.anthropic.com

### 3. Start the dev server
```bash
npm run dev
```

Open http://localhost:5173

---

## Project structure

```
adulting-sg/
├── .env                          ← YOUR API KEYS GO HERE
├── index.html
├── vite.config.js                ← Dev proxy for API calls
├── tailwind.config.js
└── src/
    ├── App.jsx                   ← Root layout, tab nav, profile state
    ├── main.jsx
    ├── index.css
    ├── lib/
    │   ├── profile.js            ← profile.md read/write (localStorage)
    │   ├── tinyfish.js           ← Tinyfish SSE client + task builders
    │   └── claude.js             ← Claude API streaming client
    └── components/
        ├── Onboarding.jsx        ← 4-step profile setup wizard
        ├── CardModule.jsx        ← Credit card recommendations + autofill
        ├── BTOModule.jsx         ← BTO tracker + guidance + autofill
        ├── AutofillPanel.jsx     ← Live SSE log + handoff screen
        └── ProfileEditor.jsx     ← Edit profile.md in a modal
```

---

## How the Tinyfish autofill works

1. User clicks **Auto-fill application** on a card or BTO step
2. App builds a natural language task string from `profile.md` fields
3. `runAutomationSSE()` sends a POST to `https://agent.tinyfish.ai/v1/automation/run-sse`
4. SSE events stream back in real time:
   - `STARTED` → automation began
   - `STREAMING_URL` → live browser iframe embed URL
   - `PROGRESS` → what Tinyfish is currently doing (shown in log)
   - `COMPLETE` → done, with result
5. If Tinyfish detects SingPass / OTP / 2FA → shows handoff screen with link
6. **Form is never auto-submitted** — user always reviews and submits manually

---

## Deploy to Vercel

```bash
npm run build
npx vercel --prod
```

Add your env vars in the Vercel dashboard under Project → Settings → Environment Variables.

---

## Safety notes

- Profile data is stored in **localStorage only** — never sent to any server except the AI APIs
- Autofill tasks explicitly instruct Tinyfish **never to submit** forms
- First autofill always shows a consent prompt
- Users can view and edit their raw `profile.md` at any time via the profile button
