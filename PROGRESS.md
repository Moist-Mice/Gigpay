# GigPay — Progress Tracker

> Updated: Phase 2 Core Engine complete

---

## Phase 1 — Foundation ✅

### Supabase Setup
- [ ] Create Supabase project (region: ap-south-1 Mumbai)
- [ ] Run `supabase/schema.sql` in SQL Editor
- [ ] Disable RLS on all tables *(schema SQL does this)*
- [ ] Create Storage bucket: `screenshots` — Private, 10MB, image/jpeg,image/png,image/webp
- [ ] Create Storage bucket: `pdfs` — Public, 5MB, application/pdf

### Clerk Setup
- [ ] Create app at clerk.com
- [ ] Enable Phone Number sign-in ONLY (disable email, Google)
- [ ] Set SMS provider (Clerk built-in Twilio)
- [ ] Copy publishable key → `.env.local` → `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- [ ] Copy secret key → Supabase Edge Function secrets → `CLERK_SECRET_KEY`
- [ ] Set allowed redirect URI: `gigipay://` (for Expo)

### Expo App
- [x] `package.json` initialised
- [x] Expo SDK 53 installed
- [x] `expo-router` installed
- [x] `@clerk/clerk-expo` + `expo-secure-store` installed
- [x] `@supabase/supabase-js` installed
- [ ] Fill `.env.local` with real Supabase + Clerk keys

### Files Created
- [x] `constants/theme.ts` — brand colors + spacing
- [x] `constants/copy.ts` — Hindi/English strings
- [x] `lib/types.ts` — TypeScript interfaces
- [x] `lib/supabase.ts` — Supabase client (DB+Storage, no Auth)
- [x] `lib/intelligence.ts` — analyseIncome() engine
- [x] `lib/share.ts` — share helpers (placeholder)
- [x] `app/_layout.tsx` — ClerkProvider + AuthGate
- [x] `app/(auth)/_layout.tsx`
- [x] `app/(auth)/index.tsx` — Phone entry screen
- [x] `app/(auth)/otp.tsx` — OTP verify screen
- [x] `app/onboarding/name.tsx` — Name + platform
- [x] `app/(tabs)/_layout.tsx` — Bottom tabs
- [x] `app/(tabs)/home.tsx` — Home dashboard
- [x] `app/(tabs)/upload.tsx` — Placeholder (replaced in Phase 2)
- [x] `app/(tabs)/certificates.tsx` — Placeholder
- [x] `app/certificate/[id].tsx` — Placeholder
- [x] `app/verify/[id].tsx` — Placeholder
- [x] `components/EarningsCard.tsx`
- [x] `components/CertificateCard.tsx`
- [x] `components/ScoreBadge.tsx`
- [x] `components/PlatformBadge.tsx`
- [x] `app.json`
- [x] `tsconfig.json`
- [x] `supabase/schema.sql`
- [x] `.env.local` (template — fill in real keys)

### Deliverables Check
- [ ] `npx expo start` runs without errors
- [ ] Phone entry screen shows with +91 prefix
- [ ] OTP screen renders (6-box layout)
- [ ] New user → name + platform screen → home
- [ ] Returning user → straight to home
- [ ] Bottom tabs navigate without crashing
- [x] `lib/intelligence.ts` exports `analyseIncome`
- [ ] Supabase tables created and accessible

---

## Phase 2 — Core Engine ✅

### Deliverables
- [x] `supabase/functions/parse-screenshot/index.ts` — Deno Edge Function (MiniMax M3 vision via OpenRouter)
- [x] `lib/upload.ts` — Storage upload + Edge Function call helper
- [x] `app/(tabs)/upload.tsx` — Camera/gallery picker, preview, upload + parse pipeline, error recovery
- [x] `app/processing/[id].tsx` — Animated polling screen (polls submission status every 2s)
- [x] `app/results/[id].tsx` — Results screen: NBFC verdict, avg income, trend %, consistency score, monthly breakdown table, bar chart, Generate Certificate CTA
- [x] `components/IncomeChart.tsx` — SVG bar chart (react-native-svg, no Victory Native)
- [x] `components/EarningsCard.tsx` — Updated to polymorphic (month row OR full submission card)
- [x] `app/(tabs)/home.tsx` — Updated: live stats strip, real submissions list, EarningsCard → results navigation
- [x] `app/certificate/generate.tsx` — Phase 3 placeholder (receives submissionId from results CTA)
- [x] `react-native-svg` installed (npx expo install)

### Edge Function Secrets to Set
> Supabase Dashboard → Project Settings → Edge Functions → Secrets
- [ ] `OPENROUTER_API_KEY=sk-or-...`
- [ ] `CLERK_SECRET_KEY=sk_live_...`

### Deploy Edge Function
```bash
supabase functions deploy parse-screenshot
```

### Demo Mode
- Long-press "Kamai Jodein" on upload screen → loads Raju Kumar / Swiggy demo data (6 months, no camera)
- Long-press also available on idle upload screen picker

---

## Phase 3 — Certificate + Share ✅

### Files Created
- [x] `supabase/functions/generate-certificate/index.ts` — Deno Edge Function (pdf-lib A4 PDF, SHA-256 hash, Supabase Storage upload)
- [x] `supabase/functions/verify-certificate/index.ts` — Public Deno Edge Function (re-computes hash, no auth)
- [x] `lib/certificate.ts` — humanId generator, maskPhone, platformNames, getVerifyUrl helpers
- [x] `lib/share.ts` — Real PDF download (expo-file-system) + system share sheet (expo-sharing)
- [x] `app/certificate/generate.tsx` — Real generate flow (calls Edge Function, auto-navigates)
- [x] `app/certificate/[id].tsx` — Full certificate viewer (QR code, metrics, share buttons)
- [x] `app/verify/[id].tsx` — Public lender verification page (SHA-256 verified banner)
- [x] `app/(tabs)/certificates.tsx` — Real certificates list with pull-to-refresh

### Dependencies Added
- [x] `react-native-qrcode-svg` — QR code display in certificate viewer

### Edge Function Secrets to Set
> Supabase Dashboard → Project Settings → Edge Functions → Secrets
- [ ] `APP_URL=https://gigpay.app` (or ngrok URL for local testing)

### Deploy Edge Functions
```bash
supabase functions deploy generate-certificate
supabase functions deploy verify-certificate
```

### Deliverables Check
- [ ] Generate Certificate CTA on results screen → spinner → certificate viewer
- [ ] Certificate viewer shows QR code, metrics, SHA-256 hash
- [ ] Share PDF button → system share sheet (WhatsApp, email, etc.)
- [ ] Verify page shows green "Certificate Verified" banner
- [ ] Certificates tab lists all issued certificates
- [x] `npx tsc --noEmit` exits clean

---

## Phase 4 — Income Explainer
- [ ] `explain-income` Edge Function (MiniMax M3 Hindi streaming)
- [ ] `IncomeExplainer.tsx` SSE streaming component

## Phase 5 — Polish + Demo
- [ ] Demo mode (seed data + bypass camera)
- [ ] Full error handling
- [ ] UI polish + animations
- [ ] `DEMO_GUIDE.md`

---

*GigPay v2 — iQOO PayBazaar PS3 Hackathon*
