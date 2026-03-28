// lib/cardDatabase.js
// Hardcoded pros/cons for Singapore credit cards.
// Matched by card name (case-insensitive, partial match).

export const CARD_DATABASE = [
  // ─── DBS ──────────────────────────────────────────────────────────────────
  {
    match: ['dbs live fresh'],
    name: 'DBS Live Fresh Card',
    bank: 'DBS',
    pros: [
      '5% cashback on online shopping & contactless payments',
      'No minimum spend to earn cashback',
      'Annual fee waived with 3 transactions/month',
    ],
    cons: [
      'Cashback capped at SGD 60/month total',
      'Only 0.3% cashback on all other spend',
      'Minimum income SGD 30,000/yr required',
    ],
    verdict: 'Great for online shoppers who pay contactless. The cap limits high spenders.',
  },
  {
    match: ['dbs altitude'],
    name: 'DBS Altitude Visa Signature',
    bank: 'DBS',
    pros: [
      '3 miles per SGD on online flight & hotel bookings',
      'Miles never expire',
      'Complimentary travel insurance up to SGD 1M',
    ],
    cons: [
      'Annual fee SGD 194 (waiver requires 25,000 miles spend)',
      'Only 1.2 mpd on general spend',
      'Minimum income SGD 30,000/yr',
    ],
    verdict: 'Best DBS card for frequent travellers. Casual spenders won\'t maximise the miles rate.',
  },
  {
    match: ['dbs multiplier'],
    name: 'DBS Multiplier Card',
    bank: 'DBS',
    pros: [
      'Up to 4.1% interest on DBS/POSB savings when paired with account',
      'Bonus interest on salary credit, insurance, investments',
      'No minimum spend on card',
    ],
    cons: [
      'Must credit salary and transact across 3+ categories to unlock high rates',
      'Requires DBS/POSB savings account to see full benefit',
      'Complex tier system to track',
    ],
    verdict: 'Best suited if you already bank with DBS and want to maximise savings interest, not a standalone card pick.',
  },
  {
    match: ['dbs vantage'],
    name: 'DBS Vantage Card',
    bank: 'DBS',
    pros: [
      '1.5 mpd on local spend, 2.2 mpd overseas',
      'Unlimited Priority Pass lounge access',
      'SGD 20,000 credit limit (high spenders)',
    ],
    cons: [
      'Annual fee SGD 594 — not waivable',
      'Minimum income SGD 120,000/yr',
      'Not suitable unless you spend SGD 5,000+/month',
    ],
    verdict: 'A premium card for high earners. Irrelevant unless you meet the income threshold.',
  },
  {
    match: ['dbs woman', 'dbs women'],
    name: 'DBS Woman\'s World Mastercard',
    bank: 'DBS',
    pros: [
      '10x points (4 mpd) on online spend',
      'No minimum spend required',
      'Strong for Shopee, Lazada, Grab purchases',
    ],
    cons: [
      'Bonus points capped at SGD 1,500 online spend/month',
      'Annual fee SGD 162.50 (first year free)',
      'Lower 1x points on non-online spend',
    ],
    verdict: 'Top choice for heavy online shoppers. The monthly cap is manageable for most.',
  },

  // ─── OCBC ─────────────────────────────────────────────────────────────────
  {
    match: ['ocbc 365'],
    name: 'OCBC 365 Credit Card',
    bank: 'OCBC',
    pros: [
      '6% cashback on dining (weekends)',
      '3% on groceries, telco, recurring bills',
      'No cashback cap on dining',
    ],
    cons: [
      'Minimum spend SGD 800/month to unlock bonus rates',
      'Annual fee SGD 194 (first 2 years free)',
      'Weekend dining restriction limits weekday value',
    ],
    verdict: 'Excellent if you spend heavily on dining, groceries and bills. The SGD 800 min spend is the hurdle.',
  },
  {
    match: ['ocbc frank'],
    name: 'OCBC Frank Credit Card',
    bank: 'OCBC',
    pros: [
      '6% cashback on foreign currency online spend',
      'Low minimum income SGD 30,000/yr',
      'Trendy card for young adults',
    ],
    cons: [
      'Minimum spend SGD 600/month for bonus cashback',
      'Only 0.3% on local non-online spend',
      'Cashback capped at SGD 75/month',
    ],
    verdict: 'Good entry-level card for young adults who shop online internationally. Cap is easy to hit.',
  },
  {
    match: ['ocbc 90', 'ocbc90n'],
    name: 'OCBC 90°N Card',
    bank: 'OCBC',
    pros: [
      '2.1 mpd on all spend (no category restrictions)',
      'Transfer to 9+ airline and hotel partners',
      'No annual fee (first year free)',
    ],
    cons: [
      'Requires SGD 800/month spend for bonus miles',
      'Miles expire after 2 years',
      'Minimum income SGD 30,000/yr',
    ],
    verdict: 'Great all-rounder miles card with broad partner redemption options.',
  },
  {
    match: ['ocbc titanium'],
    name: 'OCBC Titanium Rewards Card',
    bank: 'OCBC',
    pros: [
      '10x points on shopping (clothes, shoes, bags)',
      'Good for fashion and department store spend',
      'No minimum spend required',
    ],
    cons: [
      'Bonus capped at 10,000 points/month',
      'Only 1x points on non-shopping categories',
      'Annual fee SGD 194',
    ],
    verdict: 'Niche card for fashion shoppers. Useless if shopping isn\'t your main spend.',
  },

  // ─── UOB ──────────────────────────────────────────────────────────────────
  {
    match: ['uob one'],
    name: 'UOB One Card',
    bank: 'UOB',
    pros: [
      'Up to 10% cashback when paired with UOB One Account',
      '5% on Grab, Shopee, Dairy Farm (Cold Storage, Giant)',
      'Consistent quarterly cashback structure',
    ],
    cons: [
      'Must credit salary to UOB One Account for full benefit',
      'SGD 500 or SGD 1,000 min spend per month required',
      'Cashback paid quarterly, not monthly',
    ],
    verdict: 'Singapore\'s most popular cashback card for a reason — best when paired with UOB One Account.',
  },
  {
    match: ['uob evol'],
    name: 'UOB EVOL Card',
    bank: 'UOB',
    pros: [
      '8% cashback on mobile contactless & online spend',
      'No annual fee ever',
      'Good for Grab, Shopee, and contactless payments',
    ],
    cons: [
      'Cashback capped at SGD 80/quarter',
      'Must spend at least SGD 600/month',
      'Minimum income SGD 30,000/yr',
    ],
    verdict: 'Strong no-fee card for young adults who pay contactless. Quarterly cap is generous.',
  },
  {
    match: ['uob absolute'],
    name: 'UOB Absolute Cashback Card',
    bank: 'UOB',
    pros: [
      '1.7% cashback on ALL spend with no cap',
      'No minimum spend required',
      'No category exclusions',
    ],
    cons: [
      'Annual fee SGD 194 (waivable)',
      'Lower rate than category-specific cards',
      'Minimum income SGD 30,000/yr',
    ],
    verdict: 'Best pick if you want simplicity — one flat rate on everything, no tracking needed.',
  },
  {
    match: ['uob lady'],
    name: 'UOB Lady\'s Card',
    bank: 'UOB',
    pros: [
      '10x points on 1 chosen category (dining, beauty, etc.)',
      'Category can be changed monthly',
      'Strong for flexible lifestyle spend',
    ],
    cons: [
      'Bonus category limited to 1 choice at a time',
      'Only available to female cardholders',
      'Annual fee SGD 194',
    ],
    verdict: 'Excellent flexibility — pick your highest-spend category each month to maximise points.',
  },
  {
    match: ['uob krisflyer', 'uob krisflyeruob'],
    name: 'UOB KrisFlyer Credit Card',
    bank: 'UOB',
    pros: [
      'Miles credited directly to KrisFlyer — no conversion needed',
      '3 mpd on Singapore Airlines purchases',
      'Annual KrisFlyer elite miles bonus',
    ],
    cons: [
      'Only 1.2 mpd on general spend',
      'Tied to Singapore Airlines ecosystem only',
      'Annual fee SGD 194',
    ],
    verdict: 'Ideal if you fly Singapore Airlines regularly. Limited value if you use other airlines.',
  },

  // ─── Citibank ──────────────────────────────────────────────────────────────
  {
    match: ['citi cashback', 'citibank cashback'],
    name: 'Citi Cashback Card',
    bank: 'Citibank',
    pros: [
      '8% cashback on dining, groceries, and petrol',
      'No minimum spend on petrol cashback',
      'Widely accepted at petrol stations',
    ],
    cons: [
      'SGD 800 minimum spend/month for bonus rates',
      'Cashback capped at SGD 25/category/month',
      'Annual fee SGD 194',
    ],
    verdict: 'Top card for drivers who also dine out and grocery shop frequently.',
  },
  {
    match: ['citi premiermiles', 'citi premier miles'],
    name: 'Citi PremierMiles Card',
    bank: 'Citibank',
    pros: [
      '2 mpd on all overseas spend',
      'Transfer miles to 10+ airline partners',
      'Annual 10,000 bonus miles on renewal',
    ],
    cons: [
      'Only 1.2 mpd on local spend',
      'Annual fee SGD 194 (non-waivable after first year)',
      'Minimum income SGD 30,000/yr',
    ],
    verdict: 'Great for frequent travellers wanting flexibility across multiple airlines.',
  },
  {
    match: ['citi rewards'],
    name: 'Citi Rewards Card',
    bank: 'Citibank',
    pros: [
      '10x points on online and shopping spend',
      'Points transferable to multiple partners',
      'No minimum spend required',
    ],
    cons: [
      'Bonus capped at SGD 1,000 spend/month',
      'Points expire after 5 years',
      'Annual fee SGD 194',
    ],
    verdict: 'Solid rewards card for online shoppers who want flexible point redemption.',
  },
  {
    match: ['citi smrt'],
    name: 'Citi SMRT Card',
    bank: 'Citibank',
    pros: [
      '5% savings on groceries, fast food, and public transport',
      'EZ-Reload auto top-up for transit',
      'No minimum spend required',
    ],
    cons: [
      'Savings as SMRT$ (not cash), can only redeem at merchants',
      'Limited redemption partners',
      'Annual fee SGD 194 after first year',
    ],
    verdict: 'Useful if you spend heavily on groceries and public transport. Redemption restrictions limit flexibility.',
  },

  // ─── Standard Chartered ───────────────────────────────────────────────────
  {
    match: ['standard chartered smart', 'sc smart'],
    name: 'Standard Chartered Smart Credit Card',
    bank: 'Standard Chartered',
    pros: [
      '1.5% cashback on all spend, no minimum',
      'No annual fee forever',
      'Simple flat-rate structure',
    ],
    cons: [
      'Cashback capped at SGD 150/month',
      'No bonus for any category',
      'Minimum income SGD 30,000/yr',
    ],
    verdict: 'Best no-fee flat cashback card in Singapore. Set-and-forget simplicity.',
  },
  {
    match: ['standard chartered simply cash', 'sc simply cash'],
    name: 'Standard Chartered Simply Cash',
    bank: 'Standard Chartered',
    pros: [
      '1.5% cashback on all spend with no cap',
      'No minimum spend required',
      'Annual fee waivable',
    ],
    cons: [
      'No bonus categories',
      'Flat rate means less value than category cards',
      'Annual fee SGD 194 if not waived',
    ],
    verdict: 'Reliable catch-all card. Best paired with a category-specific primary card.',
  },
  {
    match: ['standard chartered journey', 'sc journey'],
    name: 'Standard Chartered Journey Credit Card',
    bank: 'Standard Chartered',
    pros: [
      '3 mpd on local dining, grocery, and transport',
      '2 mpd on all other local spend',
      'No annual fee first year',
    ],
    cons: [
      'Annual fee SGD 194 after first year',
      'No overseas bonus miles',
      'Minimum income SGD 30,000/yr',
    ],
    verdict: 'Excellent everyday miles card for locals who don\'t travel much but want to accumulate miles.',
  },

  // ─── HSBC ─────────────────────────────────────────────────────────────────
  {
    match: ['hsbc revolution'],
    name: 'HSBC Revolution Credit Card',
    bank: 'HSBC',
    pros: [
      '10x points on dining, shopping, and entertainment',
      'No annual fee ever',
      'No minimum spend required',
    ],
    cons: [
      'Bonus capped at SGD 1,000 spend/month',
      'Only 1x points on other categories',
      'Minimum income SGD 30,000/yr',
    ],
    verdict: 'One of the best no-fee cards for dining and entertainment rewards.',
  },
  {
    match: ['hsbc travelone', 'hsbc travel one'],
    name: 'HSBC TravelOne Credit Card',
    bank: 'HSBC',
    pros: [
      '2.4 mpd on overseas spend',
      'Instant mile transfers to 10+ partners',
      'Complimentary airport lounge access (4x/year)',
    ],
    cons: [
      'Annual fee SGD 194 (not always waivable)',
      'Only 1.2 mpd locally',
      'Minimum income SGD 30,000/yr',
    ],
    verdict: 'Strong travel card with instant transfers — useful if you want flexible redemption.',
  },
  {
    match: ['hsbc advance'],
    name: 'HSBC Advance Credit Card',
    bank: 'HSBC',
    pros: [
      '2.5% cashback on all spend (Advance banking customers)',
      '1.5% for non-Advance customers',
      'No minimum spend',
    ],
    cons: [
      'Best rates require HSBC Advance bank account',
      'Cashback capped at SGD 70/month',
      'Annual fee SGD 194',
    ],
    verdict: 'Good cashback rate if you bank with HSBC Advance. Otherwise the cap limits value.',
  },

  // ─── Maybank ──────────────────────────────────────────────────────────────
  {
    match: ['maybank family', 'maybank family & friends'],
    name: 'Maybank Family & Friends Card',
    bank: 'Maybank',
    pros: [
      '8% cashback on groceries, dining, and petrol',
      'One of the highest grocery cashback rates',
      'Simple category structure',
    ],
    cons: [
      'SGD 1,000 minimum spend/month required',
      'Cashback capped at SGD 125/month',
      'Annual fee SGD 180',
    ],
    verdict: 'Best for families with high grocery and dining spend. The SGD 1,000 min spend is a commitment.',
  },
  {
    match: ['maybank horizon'],
    name: 'Maybank Horizon Visa Signature',
    bank: 'Maybank',
    pros: [
      '3.2 mpd on dining, petrol, and taxi/ride-hailing',
      '2 mpd on overseas spend',
      'Annual fee first year free',
    ],
    cons: [
      'Must spend SGD 300/month for bonus rates',
      'Annual fee SGD 180 thereafter',
      'Minimum income SGD 30,000/yr',
    ],
    verdict: 'Good miles card for those who dine out often and take Grab or taxis regularly.',
  },

  // ─── CIMB ─────────────────────────────────────────────────────────────────
  {
    match: ['cimb visa signature'],
    name: 'CIMB Visa Signature Card',
    bank: 'CIMB',
    pros: [
      '10% cashback on beauty, fashion, and dining (weekends)',
      'No annual fee ever',
      'No minimum spend',
    ],
    cons: [
      'Cashback capped at SGD 100/month',
      'Weekend-only dining bonus limits weekday value',
      'Minimum income SGD 30,000/yr',
    ],
    verdict: 'A strong no-fee card if you spend on beauty and fashion. Weekend dining restriction is a catch.',
  },
  {
    match: ['cimb platinum'],
    name: 'CIMB Platinum Mastercard',
    bank: 'CIMB',
    pros: [
      '10% cashback on shopping and online spend',
      'No annual fee ever',
      'No minimum spend required',
    ],
    cons: [
      'Cashback capped at SGD 100/month',
      'Limited merchant acceptance vs Visa/Amex',
      'Minimum income SGD 30,000/yr',
    ],
    verdict: 'Excellent no-fee cashback card for online shoppers. Hard to beat for the fee structure.',
  },
  {
    match: ['cimb octagon'],
    name: 'CIMB Octagon Card',
    bank: 'CIMB',
    pros: [
      'Designed for students and young adults',
      'No annual fee',
      'Low minimum income SGD 18,000/yr (students welcome)',
    ],
    cons: [
      'Lower cashback rates than premium cards',
      'Limited benefits vs other cards',
      'Mainly useful as a starter card',
    ],
    verdict: 'Best entry card for students or first-time cardholders with no credit history.',
  },

  // ─── American Express ──────────────────────────────────────────────────────
  {
    match: ['amex true cashback', 'american express true cashback'],
    name: 'American Express True Cashback Card',
    bank: 'American Express',
    pros: [
      '1.5% cashback on all spend with no cap',
      '3% cashback in first 6 months (up to SGD 5,000)',
      'No minimum spend required',
    ],
    cons: [
      'American Express acceptance lower than Visa/Mastercard',
      'Annual fee SGD 171 after first year',
      'Minimum income SGD 30,000/yr',
    ],
    verdict: 'Great welcome offer and flat cashback. Amex acceptance at some local merchants is the main risk.',
  },
  {
    match: ['amex krisflyer', 'american express krisflyer', 'amex singapore airlines'],
    name: 'American Express KrisFlyer Credit Card',
    bank: 'American Express',
    pros: [
      'Miles credited directly to KrisFlyer account',
      '3.1 mpd on Singapore Airlines purchases',
      'No conversion fee to KrisFlyer',
    ],
    cons: [
      'Only 1.1 mpd on general spend',
      'Limited to KrisFlyer — no partner transfers',
      'Amex acceptance gaps at local merchants',
    ],
    verdict: 'Best if you fly SIA exclusively and want seamless miles crediting. Restrictive for non-SIA flyers.',
  },
  {
    match: ['amex platinum', 'american express platinum'],
    name: 'American Express Platinum Credit Card',
    bank: 'American Express',
    pros: [
      '50,000 bonus miles welcome offer',
      'Unlimited Priority Pass lounge access',
      'Comprehensive travel and purchase protection',
    ],
    cons: [
      'Annual fee SGD 1,712 — very high',
      'Minimum income SGD 200,000+/yr',
      'Only worth it if you travel frequently in business/first class',
    ],
    verdict: 'Ultra-premium card for high earners. The annual fee makes it a poor pick for most.',
  },

  // ─── Trust Bank ────────────────────────────────────────────────────────────
  {
    match: ['trust credit', 'trust bank'],
    name: 'Trust Credit Card',
    bank: 'Trust Bank',
    pros: [
      'Up to 1.5% cashback on FairPrice grocery spend',
      'Paired with FairPrice Plus rewards for additional savings',
      'No annual fee',
    ],
    cons: [
      'Best value only at FairPrice stores',
      'Limited acceptance for premium travel benefits',
      'Minimum income SGD 30,000/yr',
    ],
    verdict: 'Worth having if you grocery shop at FairPrice regularly. Too narrow for a primary card.',
  },

  // ─── Grab ──────────────────────────────────────────────────────────────────
  {
    match: ['grabpay card', 'grab card'],
    name: 'GrabPay Mastercard',
    bank: 'Grab',
    pros: [
      '1.5% GrabRewards points on all spend',
      'Earn points on Grab rides, GrabFood, and groceries',
      'No annual fee',
    ],
    cons: [
      'Points tied to Grab ecosystem only',
      'Not accepted everywhere (Mastercard but GrabPay backend)',
      'Limited redemption options outside Grab',
    ],
    verdict: 'Great supplement if you use Grab heavily. Too ecosystem-locked as a primary card.',
  },
]

/**
 * Look up a card in the database by name.
 * Pass 1: any keyword is contained in the normalised card name (or vice versa).
 * Pass 2: word-overlap score ≥ 0.5 across significant words.
 */
export function findCardInDatabase(cardName) {
  if (!cardName) return null

  // Normalise: lowercase, strip punctuation & common noise words
  const normalise = (s) =>
    s.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\b(card|credit|visa|mastercard|mastercard|platinum|signature|world|infinite|metal)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim()

  const lower = normalise(cardName)

  // Pass 1 — keyword substring match (both directions)
  for (const card of CARD_DATABASE) {
    for (const keyword of card.match) {
      const kw = normalise(keyword)
      if (lower.includes(kw) || kw.includes(lower)) return card
    }
  }

  // Pass 2 — word overlap (handles "UOB One" vs "UOB One Mastercard" etc.)
  const inputWords = lower.split(/\s+/).filter(w => w.length > 1)
  let bestScore = 0
  let bestCard = null

  for (const card of CARD_DATABASE) {
    for (const keyword of card.match) {
      const kwWords = normalise(keyword).split(/\s+/).filter(w => w.length > 1)
      const overlap = inputWords.filter(w => kwWords.includes(w)).length
      const score = overlap / Math.max(kwWords.length, inputWords.length)
      if (score > bestScore && score >= 0.5) {
        bestScore = score
        bestCard = card
      }
    }
  }

  return bestCard
}

/**
 * Generate basic pros/cons from the card's tag when no database entry exists.
 * No API call needed — purely derived from what Tinyfish already returned.
 */
export function generateFallbackBreakdown(card) {
  const tag = (card.tag || '').toLowerCase()
  const bank = card.bank || ''

  const pros = []
  const cons = []

  // Derive pros from the tag Tinyfish assigned
  if (tag.includes('cashback') || tag.includes('cash back')) {
    pros.push('Earns cashback on everyday spend')
    pros.push('Cash rewards credited directly to your account')
  } else if (tag.includes('miles') || tag.includes('travel')) {
    pros.push('Earn air miles on all spend')
    pros.push('Transfer miles to major frequent flyer programmes')
  } else if (tag.includes('dining') || tag.includes('food')) {
    pros.push('Bonus rewards on dining and food delivery')
    pros.push('Great for frequent restaurant visits')
  } else if (tag.includes('online') || tag.includes('shopping')) {
    pros.push('Higher rewards on online shopping platforms')
    pros.push('Good for Shopee, Lazada, and overseas websites')
  } else if (tag.includes('no fee') || tag.includes('no annual')) {
    pros.push('No annual fee — keeps cost of ownership at zero')
    pros.push('Good entry card with no commitment')
  } else if (tag.includes('petrol') || tag.includes('fuel')) {
    pros.push('Significant savings on petrol at major stations')
    pros.push('Bonus on transport spend')
  } else {
    pros.push('Recommended for your spending profile by Tinyfish')
    pros.push(`Issued by ${bank} — widely accepted in Singapore`)
  }

  pros.push(`Shortlisted by Tinyfish as: "${card.tag}"`)

  cons.push('Check minimum spend requirement to unlock bonus rates')
  cons.push('Review annual fee waiver conditions before applying')

  return {
    pros,
    cons,
    verdict: `This card was shortlisted for you based on your profile. Visit the ${bank} website for full terms and current promotions before applying.`,
  }
}
