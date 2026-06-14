# GigPay — Master Plan (Revised)
> Single source of truth. Read this before every session, every handoff, every agent switch.
> **Key changes from v1**: Auth → Clerk (phone OTP), On-device LLM → MiniMax M3 via OpenRouter API

---

## What Is GigPay

A mobile app for India's 12M+ gig workers (Swiggy / Zomato / Rapido delivery workers).

**The problem**: Raju delivers for Swiggy, earns ₹18,000/month consistently for 2 years. Applies for a ₹50,000 loan. Gets rejected — no salary slip, no Form 16, no employer letter.

**The solution**: Photograph earnings screen → AI reads it → income analysis → tamper-proof PDF certificate with SHA-256 hash → share to lender on WhatsApp. First formal income proof of his life.

---

## Tech Stack

| Layer | Tech | Why |
|-------|------|-----|
| Mobile | React Native + Expo (managed) | Cross-platform, camera, WhatsApp share |
| Auth | **Clerk** (phone OTP) | Drop-in, handles SMS, session management, India-ready |
| Backend | Supabase | No-infra DB + Storage + Edge Functions |
| Cloud AI (screenshot) | **MiniMax M3 via OpenRouter** (server-side) | iQOO-provided API, runs in Edge Function |
| Income Explainer | **MiniMax M3 via OpenRouter** | Hindi explainer, streaming, same API |
| PDF | pdf-lib | Certificate generation in Deno Edge Function |
| Charts | Victory Native | Income trend visualisation |
| Collab | GitHub | PR-based, one branch per phase |

> **Note**: Both AI calls (screenshot parsing + income explainer) use MiniMax M3 via OpenRouter. The API endpoint, headers, and model string are documented below.

---

## Architecture

```
[React Native Expo App]
        |
        | HTTPS
        ↓
[Clerk]  ←→  Phone OTP auth, session JWT
        |
        ↓
[Supabase]
  ├── Postgres (users, income_submissions, certificates, verifications)
  ├── Storage (screenshots/ private, pdfs/ public)
  └── Edge Functions (Deno)
        ├── parse-screenshot     ← calls MiniMax M3 via OpenRouter
        ├── generate-certificate ← pdf-lib + SHA-256
        ├── verify-certificate   ← public QR lookup
        └── explain-income       ← MiniMax M3 Hindi explainer (streaming)

[OpenRouter API]
  └── MiniMax M3 (minimax/minimax-m3) — both screenshot parse + income explain
```

---

## Clerk Setup (replaces Supabase Auth)

### Install
```bash
npx expo install @clerk/clerk-expo expo-secure-store
```

### `app/_layout.tsx` — Root with ClerkProvider
```typescript
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';

const tokenCache = {
  async getToken(key: string) { return SecureStore.getItemAsync(key); },
  async saveToken(key: string, value: string) { return SecureStore.setItemAsync(key, value); },
};

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={tokenCache}
    >
      <RootNavigator />
    </ClerkProvider>
  );
}
```

### Phone OTP Flow
```typescript
import { useSignIn } from '@clerk/clerk-expo';

// Step 1: Send OTP
const { signIn } = useSignIn();
await signIn.create({ identifier: '+91' + phoneNumber });
const firstFactor = signIn.supportedFirstFactors.find(f => f.strategy === 'phone_code');
await signIn.prepareFirstFactor({ strategy: 'phone_code', phoneNumberId: firstFactor.phoneNumberId });

// Step 2: Verify OTP
const result = await signIn.attemptFirstFactor({ strategy: 'phone_code', code: otpCode });
if (result.status === 'complete') {
  await setActive({ session: result.createdSessionId });
}
```

### Auth gate in `app/_layout.tsx`
```typescript
import { useAuth } from '@clerk/clerk-expo';
const { isSignedIn, isLoaded } = useAuth();
// if !isLoaded → show splash
// if !isSignedIn → redirect to (auth)/
// if isSignedIn → redirect to (tabs)/home
```

### Passing Clerk JWT to Supabase Edge Functions
```typescript
import { useAuth } from '@clerk/clerk-expo';
const { getToken } = useAuth();
const token = await getToken();

// Pass as Authorization header to Supabase Edge Functions
const response = await fetch(`${SUPABASE_URL}/functions/v1/parse-screenshot`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,   // Clerk JWT
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
  },
  body: JSON.stringify({ storage_path, user_id, platform_hint }),
});
```

### Edge Function: Verify Clerk JWT
```typescript
import { createClient } from "npm:@supabase/supabase-js";

// In Edge Function, verify caller using Clerk JWT
// Clerk JWTs are standard JWTs — decode to get user ID
const authHeader = req.headers.get('Authorization') ?? '';
const token = authHeader.replace('Bearer ', '');

// Decode JWT (no library needed for Deno — use base64)
const [, payloadB64] = token.split('.');
const payload = JSON.parse(atob(payloadB64));
const clerkUserId = payload.sub; // Clerk user ID

// Map Clerk user ID to your users table
const { data: user } = await supabaseAdmin
  .from('users')
  .select('*')
  .eq('clerk_user_id', clerkUserId)
  .single();
```

---

## Database Schema

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table: note clerk_user_id instead of auth.users FK
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT UNIQUE NOT NULL,  -- Clerk's user ID (e.g. "user_abc123")
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  platform TEXT CHECK (platform IN ('swiggy', 'zomato', 'rapido', 'other')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE income_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT,
  screenshot_url TEXT,
  raw_parsed_json JSONB,
  months_data JSONB,
  avg_monthly_income NUMERIC,
  trend_pct NUMERIC,
  consistency_score NUMERIC,
  seasonality_flags JSONB DEFAULT '[]',
  nbfc_verdict TEXT CHECK (nbfc_verdict IN ('STRONG', 'MODERATE', 'WEAK')),
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'complete', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  human_id TEXT UNIQUE NOT NULL,
  submission_id UUID REFERENCES income_submissions(id),
  user_id UUID REFERENCES users(id),
  pdf_url TEXT,
  sha256_hash TEXT NOT NULL,
  qr_data TEXT,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  verified_count INT DEFAULT 0
);

CREATE TABLE verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  certificate_id UUID REFERENCES certificates(id),
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  verifier_ip TEXT
);

-- RLS: Supabase is now only a DB/storage layer; auth enforced at Edge Function level
-- Keep RLS disabled OR use service role only from Edge Functions
-- (Clerk handles auth — Supabase no longer does)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE income_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE certificates DISABLE ROW LEVEL SECURITY;
-- All writes go through Edge Functions with service role key + Clerk JWT verification
```

---

## MiniMax M3 via OpenRouter — API Reference

All AI calls use this endpoint. iQOO provides the API key.

```typescript
// constants/ai.ts
export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
export const MINIMAX_MODEL = 'minimax/minimax-m3';  // confirm exact slug from iQOO docs

// OpenRouter call (Deno Edge Function)
async function callMiniMax(messages: Array<{role: string; content: any}>, stream = false) {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://gigpay.app',
      'X-Title': 'GigPay',
    },
    body: JSON.stringify({
      model: MINIMAX_MODEL,
      messages,
      max_tokens: 1000,
      temperature: 0,
      stream,
    }),
  });
  return response;
}
```

### Screenshot Parsing (Vision) Call
```typescript
const messages = [
  {
    role: 'system',
    content: 'You are a precise data extraction AI. Return only valid JSON. No explanation, no markdown, no code fences.'
  },
  {
    role: 'user',
    content: [
      {
        type: 'image_url',
        image_url: { url: `data:image/jpeg;base64,${base64Image}` }
      },
      {
        type: 'text',
        text: `Extract all earnings data from this gig worker's platform earnings screenshot (Swiggy / Zomato / Rapido or similar Indian platform).

Return this exact JSON structure:
{
  "platform": "swiggy|zomato|rapido|unknown",
  "currency": "INR",
  "earnings": [
    {"period": "YYYY-MM", "amount": 18400, "trips": 245, "label": "October 2024"}
  ],
  "total_visible": 110400,
  "data_quality": "high|medium|low",
  "notes": "any caveats"
}

Rules:
- period must be YYYY-MM format
- amount in rupees as integer (no decimals)
- If you cannot extract earnings data, return: {"error": "reason why"}
- Extract ALL months visible
- If trips count not visible, omit the trips field`
      }
    ]
  }
];
```

### Income Explainer (Hindi) — Streaming Call
```typescript
const messages = [
  {
    role: 'system',
    content: 'You are a helpful financial assistant for Indian gig workers. Explain income reports in simple Hindi. Use short sentences. Be encouraging but accurate.'
  },
  {
    role: 'user',
    content: `Yeh income report samjhao:
    
Platform: ${platform}
Average monthly income: ₹${avgMonthly}
Income trend: ${trend >= 0 ? '+' : ''}${trend}%
Consistency score: ${consistency}/100
NBFC verdict: ${verdict}
Months: ${JSON.stringify(monthsData)}

Loan eligibility ke baare mein bhi batao. Simple Hindi mein, 4-5 sentences.`
  }
];

// Stream response tokens to app
const stream = await callMiniMax(messages, true);
// Return SSE stream from Edge Function to mobile app
```

---

## File Structure

```
gigpay/
├── app/
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx          # Phone entry
│   │   └── otp.tsx            # OTP verify (Clerk)
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── home.tsx
│   │   ├── upload.tsx
│   │   └── certificates.tsx
│   ├── onboarding/
│   │   └── name.tsx
│   ├── certificate/
│   │   └── [id].tsx
│   ├── verify/
│   │   └── [id].tsx           # Public lender verification
│   └── _layout.tsx            # ClerkProvider + auth gate
├── components/
│   ├── EarningsCard.tsx
│   ├── CertificateCard.tsx
│   ├── IncomeChart.tsx
│   ├── ScoreBadge.tsx
│   ├── PlatformBadge.tsx
│   └── IncomeExplainer.tsx    # Streaming Hindi explainer UI
├── lib/
│   ├── supabase.ts            # Supabase client (DB + Storage only)
│   ├── intelligence.ts        # Trend / consistency / seasonality
│   ├── certificate.ts         # Certificate helpers
│   └── share.ts               # WhatsApp share
├── supabase/
│   └── functions/
│       ├── parse-screenshot/index.ts      # MiniMax M3 vision
│       ├── generate-certificate/index.ts  # pdf-lib + SHA-256
│       ├── verify-certificate/index.ts    # Public QR lookup
│       └── explain-income/index.ts        # MiniMax M3 Hindi streaming
├── constants/
│   ├── theme.ts
│   └── copy.ts                # All user-facing strings (EN + HI)
└── assets/
    └── demo/
        └── swiggy-earnings-mock.jpg
```

---

## Environment Variables

```env
# .env.local — NEVER COMMIT
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
EXPO_PUBLIC_APP_URL=https://gigpay.app

# Supabase Edge Function Secrets (set via Supabase dashboard)
OPENROUTER_API_KEY=sk-or-...       # iQOO-provided
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # auto-available in Edge Functions
CLERK_SECRET_KEY=sk_live_...       # for JWT verification in Edge Functions
```

---

## Build Phases

### Phase 1 — Foundation (H 0–8)
**Dev A**: Supabase schema + Storage buckets + secrets  
**Dev B**: Expo scaffold + Clerk auth screens

Deliverables:
- [ ] Supabase project + tables + storage
- [ ] Clerk project configured (phone OTP, India +91)
- [ ] Expo app scaffolded with Expo Router
- [ ] ClerkProvider in root layout, auth gate working
- [ ] Phone → OTP → Onboarding (name + platform) → Home flow
- [ ] `lib/supabase.ts` initialised (DB + Storage client only)
- [ ] `constants/theme.ts` with brand colors

### Phase 2 — Core Engine (H 8–18)
**Dev A**: `parse-screenshot` Edge Function (MiniMax M3 vision) + intelligence engine  
**Dev B**: Upload flow screens + results display

Deliverables:
- [ ] `parse-screenshot` Edge Function with MiniMax M3 OpenRouter call
- [ ] Clerk JWT verification in Edge Functions
- [ ] `lib/intelligence.ts` — trend, consistency, seasonality, NBFC verdict
- [ ] Camera / image picker screen
- [ ] Upload to Supabase Storage
- [ ] Processing loading screen (status messages)
- [ ] Results screen: monthly table + intelligence metrics

### Phase 3 — Certificate + Share (H 18–28)
**Dev A**: `generate-certificate` + `verify-certificate` Edge Functions  
**Dev B**: Certificate view screen + WhatsApp share + `/verify/[id]` web page

Deliverables:
- [ ] `generate-certificate` Edge Function (pdf-lib, SHA-256, QR, Supabase Storage upload)
- [ ] `verify-certificate` Edge Function (hash re-verification)
- [ ] Certificate view screen (metrics, QR, share buttons)
- [ ] `lib/share.ts` — download PDF + share sheet
- [ ] `/verify/[id]` public page (mobile browser friendly)

### Phase 4 — Income Explainer (H 28–34)
**Dev A**: `explain-income` Edge Function (MiniMax M3, streaming, Hindi)  
**Dev B**: `IncomeExplainer.tsx` component (streaming token display)

Deliverables:
- [ ] `explain-income` Edge Function with SSE streaming
- [ ] "Explain my report" button on results screen
- [ ] Streaming Hindi text renders in app
- [ ] Works offline-ish (graceful error if no connection)

### Phase 5 — Polish + Demo (H 34–40)
Both devs together.

Deliverables:
- [ ] Demo mode (seed data + bypass camera)
- [ ] Error handling for all edge cases
- [ ] UI polish (brand colors, loading states, animations)
- [ ] Hindi/English bilingual copy
- [ ] `DEMO_GUIDE.md` written
- [ ] Full flow tested on physical Android device

---

## Income Intelligence Engine (`lib/intelligence.ts`)

```typescript
export interface MonthData {
  period: string;    // "YYYY-MM"
  amount: number;    // INR integer
  trips?: number;
}

export interface IncomeAnalysis {
  avg_monthly: number;
  trend_pct: number;           // positive = growing
  consistency_score: number;   // 0–100
  best_month: string;
  worst_month: string;
  seasonality_flags: string[]; // e.g. ["2024-10: Diwali spike +34%"]
  nbfc_verdict: 'STRONG' | 'MODERATE' | 'WEAK';
}

export function analyseIncome(earnings: MonthData[]): IncomeAnalysis {
  const sorted = [...earnings].sort((a, b) => a.period.localeCompare(b.period));
  const amounts = sorted.map(e => e.amount);
  const n = amounts.length;

  // Average
  const avg = amounts.reduce((s, a) => s + a, 0) / n;

  // Trend: linear regression slope as % of mean
  const xMean = (n - 1) / 2;
  let num = 0, den = 0;
  amounts.forEach((y, i) => { num += (i - xMean) * (y - avg); den += (i - xMean) ** 2; });
  const slope = den === 0 ? 0 : num / den;
  const trend_pct = (slope / avg) * 100;

  // Consistency: % of months where amount >= 80% of avg
  const consistentMonths = amounts.filter(a => a >= avg * 0.8).length;
  const consistency_score = Math.round((consistentMonths / n) * 100);

  // Seasonality: flag months with >20% deviation
  const seasonality_flags = sorted
    .filter(m => Math.abs(m.amount - avg) / avg > 0.2)
    .map(m => {
      const dev = ((m.amount - avg) / avg * 100).toFixed(0);
      const label = new Date(m.period + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      return `${label}: ${Number(dev) >= 0 ? '+' : ''}${dev}%`;
    });

  // NBFC verdict
  let nbfc_verdict: 'STRONG' | 'MODERATE' | 'WEAK' = 'WEAK';
  if (consistency_score >= 80 && trend_pct >= 0) nbfc_verdict = 'STRONG';
  else if (consistency_score >= 60) nbfc_verdict = 'MODERATE';

  const best = sorted.reduce((b, m) => m.amount > b.amount ? m : b);
  const worst = sorted.reduce((b, m) => m.amount < b.amount ? m : b);

  return {
    avg_monthly: Math.round(avg),
    trend_pct: Math.round(trend_pct * 10) / 10,
    consistency_score,
    best_month: best.period,
    worst_month: worst.period,
    seasonality_flags,
    nbfc_verdict,
  };
}
```

---

## Certificate PDF Structure (pdf-lib, A4 595×842pt)

Top → Bottom:
1. **Orange header strip** (80pt): "GigPay" white bold + "Income Verification Certificate" + Certificate ID monospace right-aligned
2. **Worker details** (name, masked phone, platform, issue date)
3. **3-metric block** (Avg Monthly · Trend · Consistency Score) — large numbers
4. **Monthly earnings table** (month | amount | vs average %)
5. **Tamper evidence block** (SHA-256 hash first 32 chars + QR code 80×80pt right)
6. **Disclaimer** (small gray text, 7pt)
7. **Footer strip** (gray): gigpay.app | verify URL | date

SHA-256 input: `user_id|submission_id|JSON.stringify(months_data)|avg_monthly_income|YYYY-MM-DD`

---

## API Contracts Summary

### `POST /parse-screenshot`
Input: `{ storage_path, user_id, platform_hint? }`  
Output: `{ submission_id, platform, months_count, months_data, avg_monthly_income, trend_pct, consistency_score, nbfc_verdict, status }`

### `POST /generate-certificate`
Input: `{ submission_id, user_id }`  
Output: `{ certificate_id, human_id, pdf_url, sha256_hash, qr_data, issued_at }`

### `GET /verify-certificate?id=GIG-YYYY-XXXXX`
Public, no auth.  
Output: `{ valid, worker_name, platform, avg_monthly_income, consistency_score, trend_pct, nbfc_verdict, hash_verified, verified_count }`

### `POST /explain-income` (SSE stream)
Input: `{ submission_id, user_id }`  
Output: Server-Sent Events stream of Hindi explanation tokens

---

## TypeScript Types

```typescript
// lib/types.ts

export interface User {
  id: string;
  clerk_user_id: string;
  phone: string;
  name: string;
  platform: 'swiggy' | 'zomato' | 'rapido' | 'other';
  created_at: string;
}

export interface MonthData {
  period: string;    // "YYYY-MM"
  amount: number;
  trips?: number;
}

export interface IncomeSubmission {
  id: string;
  user_id: string;
  platform: string;
  screenshot_url: string;
  months_data: MonthData[];
  avg_monthly_income: number;
  trend_pct: number;
  consistency_score: number;
  seasonality_flags: string[];
  nbfc_verdict: 'STRONG' | 'MODERATE' | 'WEAK';
  status: 'processing' | 'complete' | 'failed';
  created_at: string;
}

export interface Certificate {
  id: string;
  human_id: string;
  submission_id: string;
  user_id: string;
  pdf_url: string;
  sha256_hash: string;
  qr_data: string;
  issued_at: string;
  verified_count: number;
}
```

---

## Brand / Theme

```typescript
// constants/theme.ts
export const colors = {
  primary:      '#F97316',  // saffron orange — all CTAs, accents
  primaryDark:  '#EA580C',
  background:   '#FAFAFA',
  card:         '#FFFFFF',
  text:         '#1A1A1A',
  textMuted:    '#6B7280',
  success:      '#16A34A',
  danger:       '#DC2626',
  warning:      '#D97706',
  border:       '#E5E7EB',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
```

```typescript
// constants/copy.ts
export const copy = {
  addEarnings:        'Kamai Jodein (Add Earnings)',
  generateCert:       'Certificate Banayein',
  shareWhatsApp:      'WhatsApp pe Bhejein',
  tagline:            'Apni kamai ka certificate',
  emptyState:         'No earnings added yet',
  processingSteps: [
    'Reading your earnings...',
    'AI is analysing the data...',
    'Calculating your income score...',
  ],
};
```

---

## Demo Data (Raju Kumar — Swiggy)

```typescript
// scripts/seed-demo.ts
const demoUser = {
  clerk_user_id: 'user_demo_raju',
  phone: '+919999999999',
  name: 'Raju Kumar',
  platform: 'swiggy',
};

const demoMonths: MonthData[] = [
  { period: '2025-01', amount: 16800, trips: 212 },
  { period: '2025-02', amount: 17200, trips: 218 },
  { period: '2025-03', amount: 18100, trips: 229 },
  { period: '2025-04', amount: 17900, trips: 226 },
  { period: '2025-05', amount: 19200, trips: 243 },
  { period: '2025-06', amount: 18400, trips: 233 },
];
// avg: ₹17,933 | trend: +2.3% | consistency: 100% | verdict: STRONG
```

Demo mode shortcut: **long-press "Add Earnings"** to bypass camera and load this data directly.

---

## Supabase Setup Checklist

- [ ] Create project — region: ap-south-1 (Mumbai)
- [ ] Run schema SQL (users table uses `clerk_user_id TEXT`, not `auth.users` FK)
- [ ] Disable RLS on all tables (Edge Functions use service role)
- [ ] Create Storage buckets: `screenshots` (private), `pdfs` (public)
- [ ] Add Edge Function secrets:
  - `OPENROUTER_API_KEY` — iQOO-provided key
  - `CLERK_SECRET_KEY` — from Clerk dashboard
- [ ] Deploy edge functions: `supabase functions deploy --all`

## Clerk Setup Checklist

- [ ] Create app at clerk.com
- [ ] Enable Phone Number sign-in only (disable email, Google)
- [ ] Set SMS provider (Clerk's built-in Twilio works out of box)
- [ ] Copy publishable key → `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- [ ] Copy secret key → `CLERK_SECRET_KEY` (for Edge Functions)
- [ ] Set allowed redirect URLs for Expo

---

## Agent Code Quality Rules

1. **TypeScript everywhere** — all data shapes have interfaces in `lib/types.ts`
2. **async/await** — never `.then()` chains
3. **Error handling** — every API call has try/catch with user-facing message
4. **Loading states** — every async action shows spinner
5. **Single Supabase client** — always import from `lib/supabase.ts`
6. **Never expose secrets** — `OPENROUTER_API_KEY` only in Edge Functions, never in Expo app
7. **Comments** — every function has a 1-line comment
8. **Clerk first** — all auth state from Clerk hooks (`useAuth`, `useUser`), never from Supabase Auth

---

## 60-Second Demo Script

| Time | Action | Say |
|------|--------|-----|
| 0–10s | Show home with Raju's name | "Meet Raju. Delivers for Swiggy. ₹18k/month. Bank said no — no salary slip." |
| 10–25s | Tap Add Earnings → mock screenshot → processing animation | "He opens GigPay, photographs his Swiggy earnings screen. MiniMax M3 reads it instantly." |
| 25–40s | Results screen with metrics | "Trend: +12%. Consistency: 87/100. Seasonality mapped." |
| 40–50s | Tap Generate Certificate → certificate view | "One tap — PDF with SHA-256 tamper evidence." |
| 50–60s | Tap Share → WhatsApp → lender scans QR on second device | "Lender scans QR, sees verified in seconds. First formal income proof of his life." |

**Bonus moment**: Tap "Explain my report" → MiniMax M3 streams Hindi explanation on screen. Judges see AI reasoning live.

---

## Prompt Files for Antigravity

Feed these to Antigravity in order. Each references this master plan.

| File | What it builds |
|------|---------------|
| `PROMPT_PHASE1.md` | Clerk auth + Expo scaffold + DB schema |
| `PROMPT_PHASE2.md` | parse-screenshot Edge Function (MiniMax M3) + upload flow + intelligence engine |
| `PROMPT_PHASE3.md` | Certificate PDF + share + verify Edge Functions |
| `PROMPT_PHASE4.md` | explain-income Edge Function (MiniMax M3 streaming) + IncomeExplainer component |
| `PROMPT_PHASE5.md` | Demo mode + polish + error handling + DEMO_GUIDE |

---

*Last updated: June 2025 | GigPay v2 — iQOO PayBazaar PS3 Hackathon*
