# adulting.sg

## because no one teaches you this stuff

Getting your first credit card, balloting for a BTO, figuring out your CPF… every Singaporean goes through it, and most of us figure it out along the way through Reddit threads, random articles, or asking friends.

**adulting.sg** is built to change that.

It is a personalised financial co-pilot for young adults in Singapore that actually does the research for you.

---

## 💡 What It Does

adulting.sg takes in your **real profile**  
income, spending, preferences, life stage

Then it:
- goes out to the web in real time
- browses the same sites you would
- comes back with answers tailored to you

No generic advice. No static content.

---

## 🔑 Core Features

### 💳 Credit Cards
Not just a list.

adulting.sg browses sites like MoneySmart, SingSaver, and bank pages live, then:
- ranks the best cards for your spending habits
- explains real pros and cons
- gives a clear verdict on what suits you

---

### 🏠 BTO Finder
Stop manually checking launches.

- pulls upcoming HDB BTO projects
- maps them across Singapore
- ranks them based on your preferred location, budget, and flat type
- shows a simple checklist and grant eligibility

---

### 🤖 Ask Anything
A research agent for “adulting” questions.

Ask things like:
- which CPF scheme applies to me?
- how much do I need for a BTO?
- what taxes do I pay?

The agent:
- browses official sources like CPF, HDB, IRAS, MoneySense
- answers based on your profile
- uses live data instead of generic responses

---

## ⚙️ How It Works

1. **User Profile**
   - income
   - spending patterns
   - preferences
   - goals

2. **Tinyfish Automation**
   - browses websites in real time
   - extracts relevant data
   - mimics how a human would research

3. **Decision Layer**
   - matches your profile with live data
   - ranks and filters results
   - generates clear recommendations

4. **Output**
   - simple summaries
   - pros and cons
   - actionable next steps

---

## 🔒 Privacy First

- runs locally
- no accounts
- no backend
- your data stays on your device

---

## 🚀 Why We Built This

We realised most “personal finance tools” are:
- dashboards you have to interpret
- generic advice that does not apply to you
- static content that gets outdated

We wanted something different.

Something that:
- understands your situation
- does the research for you
- tells you what actually makes sense

---

---

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
