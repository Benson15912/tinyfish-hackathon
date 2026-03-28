
# adulting.sg

## 🧠 Overview

**adulting.sg** is a personal lifestyle assistant designed to help young adults in Singapore make smarter life decisions based on their profile.

By combining structured user data with browser automation powered by TinyFish, the application generates actionable insights across key areas like finances and housing — two of the most important aspects of adulting in Singapore.

---

## 🎯 Goals

Our goal is to simplify “adulting” by:

* Recommending suitable **credit cards** based on spending habits and lifestyle
* Breaking down **pros and cons** of each recommendation clearly
* Discovering **upcoming BTO launches** near a user’s preferred locations
* Helping users make informed, data-driven life decisions with minimal effort

---

## ⚙️ How It Works

### 1. User Profile

The application maintains a structured user profile containing:

* Income and spending patterns
* Lifestyle preferences (e.g. dining, travel, transport)
* Preferred housing locations

This acts as the **single source of truth** for all recommendations.

---

### 2. TinyFish Browser Automation

Using TinyFish, the app dynamically gathers real-time information from various sources:

* Credit card offerings from banks
* Promotions, benefits, and eligibility criteria
* Upcoming BTO project listings and launch details

This ensures recommendations are always **fresh and relevant**.

---

### 3. Intelligent Recommendation Engine

The system processes:

* User profile data
* Scraped web data

It then generates:

* Personalized credit card suggestions
* Clear comparisons (benefits, fees, suitability)
* Location-based BTO recommendations

---

### 4. Output

Insights are presented in a clean, human-readable format such as:

* Markdown reports (`profile.md`)
* Structured summaries
* Actionable recommendations

---

## 🧩 Features

### 💳 Credit Card Advisor

* Matches cards to your spending habits
* Highlights cashback, miles, or rewards optimization
* Explains trade-offs (fees vs benefits)

---

### 🏠 BTO Discovery

* Finds upcoming BTO launches near preferred areas
* Surfaces key details (location, timeline, eligibility)
* Helps assess readiness based on financial profile

---

### 📊 Lifestyle Insights

* Detects patterns in spending and behavior
* Suggests optimizations (e.g. reduce subscriptions, increase savings)
* Aligns actions with long-term goals

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
