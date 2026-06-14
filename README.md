# GigPay 💼
**Alternate Credit Scoring for Indian Gig Workers**  
*iQOO PayBazaar PS3 Hackathon — Team Entry*

---

## The Problem

India has ~15 crore gig workers (Swiggy, Zomato, Rapido, Ola, etc.) earning ₹15,000–₹40,000/month in cash — yet they are **invisible to the formal credit system**. Banks reject them because:
- No salary slips
- No employer letter
- No ITR / Form 16
- Irregular, seasonal income patterns

The result: these workers **cannot get loans, credit cards, or even rent homes**.

---

## What GigPay Does

GigPay generates a **tamper-proof Income Verification Certificate** by analysing a gig worker's financial documents. A lender can scan a QR code to instantly verify the certificate's authenticity via SHA-256 hash.

---

## Current Implementation (Phase 1–3 Complete)

### Stack
| Layer | Technology |
|-------|-----------|
| Mobile App | React Native + Expo SDK 54 |
| Routing | Expo Router v6 |
| Auth | Clerk (Phone OTP — no passwords) |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage (screenshots + PDFs) |
| AI Engine | OpenRouter → MiniMax M3 (vision model) |
| Edge Functions | Supabase Deno Edge Functions |
| PDF Generation | pdf-lib (server-side, inside Edge Function) |

### App Screens
```
(auth)/
  index.tsx        — Phone number entry (+91 prefix, OTP trigger)
  otp.tsx          — 6-box OTP verification (sign-in + sign-up auto-detect)

onboarding/
  name.tsx         — Worker name + platform selection (Swiggy/Zomato/Rapido)

(tabs)/
  home.tsx         — Dashboard: stats strip + submissions list
  upload.tsx       — Camera/gallery picker + demo mode (long-press)
  certificates.tsx — All issued certificates with pull-to-refresh

processing/[id].tsx  — Animated poll screen (checks status every 2s)
results/[id].tsx     — NBFC verdict, avg income, trend %, bar chart
certificate/
  generate.tsx     — Spinner → calls generate-certificate Edge Function
  [id].tsx         — Certificate viewer: QR code, SHA-256, share PDF
verify/[id].tsx    — Public lender verification page (no auth required)
```

### Edge Functions (Supabase Deno)
| Function | Purpose |
|---------|---------|
| `parse-screenshot` | Receives image → sends to MiniMax M3 via OpenRouter → returns structured JSON of monthly earnings |
| `generate-certificate` | Builds A4 PDF with pdf-lib, computes SHA-256 hash, uploads to `pdfs` bucket, stores in DB |
| `verify-certificate` | Public endpoint: re-computes hash, increments verified_count, returns worker summary |

### Database Schema
```sql
users              — clerk_user_id, phone, name, platform
income_submissions — screenshot_url, months_data, avg_monthly_income, nbfc_verdict
certificates       — human_id (GIG-2025-XXXXX), pdf_url, sha256_hash, qr_data
verifications      — certificate_id, verified_at, verifier_ip
```

### NBFC Verdict Logic (lib/intelligence.ts)
- **STRONG** — Avg ≥ ₹20k AND consistency ≥ 75% AND trend ≥ 0%
- **MODERATE** — Avg ₹12k–₹20k OR moderate consistency
- **WEAK** — Below thresholds

### Demo Mode
On the Upload screen, **long-press "Kamai Jodein"** to bypass camera and load pre-seeded Raju Kumar / Swiggy data (6 months). Tests the full results → certificate → share pipeline without any real data.

---

## Known Bugs Fixed
- ✅ **Auth: "Account doesn't exist"** — Phone screen now auto-detects new vs returning users. New users are sent through `useSignUp`, returning users through `useSignIn`. No manual sign-up needed.
- ✅ **SDK mismatch** — Upgraded from Expo SDK 53 → 54 to match phone's Expo Go version.
- ✅ **APP_URL** — Corrected from `https://gigpay.app` to `gigipay://` for on-device deep link QR codes.

---

## Setup (To Reach Testing State)

### 1. Environment Variables (`.env.local`)
```env
EXPO_PUBLIC_SUPABASE_URL=https://gjdfdwxfxbkzeurgdcgh.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_dHO2UhlTCqWEuSKHdRzsyQ_RYtGuyCY
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...    ← from clerk.com → API Keys
EXPO_PUBLIC_APP_URL=gigipay://
```

### 2. Supabase Setup
- SQL Editor → run `supabase/schema.sql`
- Storage → create bucket `screenshots` (Private, 10MB, image/*)
- Storage → create bucket `pdfs` (Public, 5MB, application/pdf)
- Project Settings → Edge Functions → Secrets:
  ```
  OPENROUTER_API_KEY = sk-or-...
  CLERK_SECRET_KEY   = sk_test_...
  APP_URL            = gigipay://
  ```

### 3. Deploy Edge Functions
```bash
npm install -g supabase
supabase login
supabase link --project-ref gjdfdwxfxbkzeurgdcgh
supabase functions deploy parse-screenshot
supabase functions deploy generate-certificate
supabase functions deploy verify-certificate
```

### 4. Run
```bash
npx expo start --tunnel --port 8082
```
Scan QR with Expo Go on Android.

---

## Pivot Plan — New Credit Scoring Engine (NOT YET IMPLEMENTED)

> The screenshot-parsing approach has been **replaced** with a richer, bank-statement-based alternate credit scoring system.

### Why the Change?

| Old Approach | New Approach |
|-------------|-------------|
| Screenshot of Swiggy earnings page | Bank statement PDF + credit card statement |
| Single platform data | Holistic financial picture |
| Prone to screenshot manipulation | Bank statement harder to fake |
| Limited signals (just income) | Rich signals: spending, debt, savings rate |

### New Product Flow

```
Worker uploads PDF (bank statement or CC statement)
          ↓
PDF sent to on-device / edge LLM
          ↓
LLM extracts structured financial data:
  - Monthly credits (income)
  - Monthly debits (expenses)
  - EMI / loan repayments
  - UPI transaction patterns
  - Savings behaviour
  - Credit utilisation (if CC)
          ↓
Credit scoring engine computes:
  - Income Stability Score
  - Debt-to-Income Ratio
  - Spending Discipline Score
  - Savings Rate
  - Composite NBFC Score (0–100)
          ↓
Certificate generated with full breakdown
```

### LLM Strategy — On-Device via OpenRouter

The iQOO 15 is a flagship Android phone with strong NPU. We use **OpenRouter** to route to models that:
1. Are **free tier** — no per-request cost during hackathon
2. Can process **PDF text** (not vision — we extract text client-side first)
3. Return **structured JSON** reliably

**Recommended model**: `google/gemma-3-12b-it:free` or `mistralai/mistral-7b-instruct:free` via OpenRouter — both free, both excellent at structured extraction from financial text.

**Why not truly on-device?**: True on-device (GGUF / llama.cpp on Android) requires a custom native module and 4–8GB model download. OpenRouter's free tier gives us the same "edge" framing without the complexity — and is more reliable for a hackathon demo.

### New Signals We Can Extract from Bank Statements

| Signal | What It Tells Lender |
|--------|---------------------|
| Avg monthly credit | Income level |
| Credit variability (std dev) | Income stability |
| UPI credit frequency | How often they get paid (daily gig vs monthly salary) |
| Recurring debit patterns | Existing EMI commitments |
| Month-end balance | Savings behaviour |
| Credit card utilisation % | Financial discipline |
| Cash withdrawal ratio | Informal economy participation |
| Rent / utility regularity | Fixed obligation reliability |

### New Technical Architecture

```
app/(tabs)/upload.tsx          ← Accept PDF (expo-document-picker)
lib/pdf-extract.ts             ← Extract text from PDF (expo-file-system + base64)
supabase/functions/
  parse-statement/index.ts     ← Send PDF text to OpenRouter LLM → structured JSON
  generate-certificate/        ← Updated: richer PDF with credit score breakdown
lib/credit-score.ts            ← Scoring engine (replaces intelligence.ts)
app/results/[id].tsx           ← Updated: credit score breakdown, debt ratios
```

### Demo Plan (Your Real Statements)

Since we don't have gig worker bank statements, we use your personal bank/CC statements as a demonstration:
1. User uploads personal bank statement PDF via the app
2. LLM extracts transactions and labels them
3. App generates a credit score breakdown
4. Certificate shows composite score (we frame as "demonstrating the technology")
5. For the hackathon pitch, we explain: "In production, gig worker platforms like Swiggy/Zomato would provide verified payout data via API — this demo shows the analysis engine working on real financial data"

### Files to Build (Next Phase)

| File | Status |
|------|--------|
| `app/(tabs)/upload.tsx` | Rewrite: PDF picker instead of camera |
| `supabase/functions/parse-statement/index.ts` | New: LLM text extraction |
| `lib/credit-score.ts` | New: scoring algorithm |
| `lib/pdf-extract.ts` | New: client-side PDF text extraction |
| `app/results/[id].tsx` | Update: show new credit signals |
| `supabase/schema.sql` | Update: new fields in income_submissions |
| `supabase/functions/generate-certificate/` | Update: richer PDF layout |

---

## Folder Structure

```
gigipay/
├── app/
│   ├── (auth)/          # Phone + OTP screens
│   ├── (tabs)/          # Home, Upload, Certificates
│   ├── certificate/     # Generate + View screens
│   ├── onboarding/      # Name + platform
│   ├── processing/      # Polling screen
│   ├── results/         # Income analysis
│   └── verify/          # Public lender verification
├── components/          # EarningsCard, IncomeChart, etc.
├── constants/           # theme.ts, copy.ts
├── lib/                 # supabase.ts, types.ts, certificate.ts, share.ts
├── supabase/
│   ├── functions/       # parse-screenshot, generate-certificate, verify-certificate
│   └── schema.sql
├── ref/                 # Original phase prompts (Phase 1, 2, 3)
├── .env.local           # Never commit this
└── README.md
```

---

## Hackathon Context

- **Event**: iQOO PayBazaar PS3 Hackathon
- **Device**: iQOO 15 (demo device)
- **Target users**: Swiggy / Zomato / Rapido / Ola delivery partners
- **Target lenders**: NBFCs, microfinance institutions, rural banks
- **Monetisation**: SaaS API for NBFCs to verify gig worker income

---

*GigPay v2 — Built with Antigravity AI*
