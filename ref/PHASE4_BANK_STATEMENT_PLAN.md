# GigPay — Phase 4: Bank Statement Credit Scoring Engine

> **Status**: Planning complete. Ready to implement.  
> **Prerequisite**: Phase 1–3 working on device (auth fixed, SDK 54 aligned).

---

## Goal

Replace the screenshot-parsing pipeline with a **bank statement + credit card statement PDF analysis engine** that produces a richer, more credible alternate credit score. The worker uploads a PDF; a free LLM extracts structured financial data; a scoring engine computes a composite credit score; a tamper-proof certificate is issued.

---

## Why This Is Better for the Hackathon

| Dimension | Screenshot (Old) | Bank Statement (New) |
|-----------|-----------------|---------------------|
| Data richness | Single platform income | Full financial picture |
| Manipulation risk | Easy to fake (Photoshop) | Bank letterhead + harder to fake |
| Credit signals | 1 signal (income) | 8+ signals |
| NBFC appeal | Low — NBFCs distrust screenshots | High — banks accept statements |
| Demo flexibility | Needs gig worker account | Any PDF works (even yours) |
| Wow factor | Basic | Strong — competitor banks do this too |

---

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                    Mobile App (Expo)                    │
│                                                        │
│  Upload Tab → expo-document-picker → PDF selected      │
│       ↓                                                │
│  lib/pdf-extract.ts → read file as base64              │
│       ↓                                                │
│  Supabase Edge Function: parse-statement               │
│       ↓                                                │
│  OpenRouter API → free LLM (Gemma 3 / Mistral)         │
│       ↓                                                │
│  Structured JSON: months[], credits, debits, EMIs      │
│       ↓                                                │
│  lib/credit-score.ts → compute 8 signals + score       │
│       ↓                                                │
│  Results screen → Score breakdown UI                   │
│       ↓                                                │
│  generate-certificate Edge Function → PDF + QR + Hash  │
└────────────────────────────────────────────────────────┘
```

---

## LLM Choice: OpenRouter Free Tier

We use **OpenRouter** (already wired in the project) with a **free model**:

| Model | Context | Good For | Free? |
|-------|---------|----------|-------|
| `google/gemma-3-12b-it:free` | 128k | Structured extraction, follows JSON schema well | ✅ |
| `mistralai/mistral-7b-instruct:free` | 32k | Fast, good JSON | ✅ |
| `meta-llama/llama-3.1-8b-instruct:free` | 128k | Excellent at finance tasks | ✅ |

**Recommended**: `google/gemma-3-12b-it:free` — 128k context fits a full 6-month bank statement.

### Why "on-device via iQOO 15" is the pitch angle:
The iQOO 15's NPU is strong, but running a 7B+ model locally requires GGUF runtime (llama.cpp Android port). For hackathon speed, OpenRouter free tier gives us the same demo outcome. The pitch: *"Our engine is model-agnostic — in production we can run the smallest quantized model on-device for privacy; in this demo we use OpenRouter's free inference."*

---

## New Files to Create

### 1. `lib/pdf-extract.ts` — Client-side PDF → base64
```typescript
// Reads PDF from device filesystem, returns base64 string
// Uses expo-file-system (already installed)
import * as FileSystem from 'expo-file-system';

export async function pdfToBase64(uri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64;
}

export async function pdfToText(uri: string): Promise<string> {
  // For hackathon: send base64 to Edge Function which extracts text via LLM vision
  // LLM can read PDF pages as images OR we use pdf-parse on server side
  const base64 = await pdfToBase64(uri);
  return base64;
}
```

### 2. `supabase/functions/parse-statement/index.ts` — LLM extraction Edge Function
```
Input:  { pdf_base64: string, user_id: string }
Output: { months: MonthData[], metadata: StatementMetadata }

Flow:
1. Verify Clerk JWT
2. Receive PDF base64
3. Call OpenRouter with PDF as multipart or text prompt
4. Parse LLM JSON response
5. Store raw JSON in income_submissions
6. Return structured data
```

**Prompt strategy** (send to LLM):
```
You are a financial data extraction engine. Extract all transactions from this bank statement.
Return ONLY valid JSON with this exact schema:
{
  "account_holder": string,
  "bank_name": string,
  "statement_period": { "from": "YYYY-MM", "to": "YYYY-MM" },
  "months": [
    {
      "month": "YYYY-MM",
      "total_credits": number,       // money coming IN
      "total_debits": number,        // money going OUT  
      "emi_payments": number,        // recurring fixed debits (loan EMIs)
      "upi_credits": number,         // UPI credit count (frequency of gig payments)
      "closing_balance": number,
      "salary_credits": number,      // large single credits (formal salary)
      "gig_credits": number          // small frequent credits (gig pattern)
    }
  ],
  "credit_card": {                   // only if CC statement
    "credit_limit": number,
    "avg_utilisation_pct": number,
    "min_payment_missed": boolean
  }
}
```

### 3. `lib/credit-score.ts` — Scoring Engine

```typescript
export interface CreditSignals {
  avgMonthlyIncome: number;         // avg total_credits
  incomeStabilityScore: number;     // 0-100: lower std dev = higher score
  debtToIncomeRatio: number;        // emi_payments / avg_credits
  savingsRate: number;              // (credits - debits) / credits
  gigIncomePattern: boolean;        // frequent small credits detected
  creditUtilisation: number;        // CC: avg utilisation %
  paymentDiscipline: number;        // 0-100: no missed payments = 100
  transactionRegularity: number;    // 0-100: consistent activity month-to-month
}

export interface CreditScore {
  composite: number;                // 0-100 overall score
  signals: CreditSignals;
  nbfcVerdict: 'STRONG' | 'MODERATE' | 'WEAK';
  loanEligibilityEstimate: number;  // ₹ max loan amount
  breakdown: ScoreBreakdown[];      // for UI display
}

// Scoring weights:
// Income stability:    25%
// Avg income level:    25%  
// Debt-to-income:      20%
// Savings rate:        15%
// Payment discipline:  10%
// Transaction regularity: 5%
```

### 4. Updated `app/(tabs)/upload.tsx` — PDF Picker
Replace camera/gallery picker with:
```typescript
import * as DocumentPicker from 'expo-document-picker';

async function pickStatement() {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
  });
  // upload + parse flow
}
```

### 5. Updated `app/results/[id].tsx` — Credit Score UI
New sections:
- **Composite Score ring** (0–100 animated gauge)
- **Signal breakdown cards** (Income Stability, Debt Ratio, Savings Rate, etc.)
- **Monthly cash flow chart** (credits vs debits bar chart, reuse IncomeChart.tsx)
- **Loan eligibility estimate** (₹X lakh max)
- **Generate Certificate CTA** (unchanged)

---

## Database Schema Changes

Add to `income_submissions`:
```sql
ALTER TABLE income_submissions ADD COLUMN IF NOT EXISTS
  statement_type TEXT CHECK (statement_type IN ('bank', 'credit_card', 'both'));

ALTER TABLE income_submissions ADD COLUMN IF NOT EXISTS
  income_stability_score NUMERIC;   -- 0-100

ALTER TABLE income_submissions ADD COLUMN IF NOT EXISTS
  debt_to_income_ratio NUMERIC;     -- 0.0-1.0

ALTER TABLE income_submissions ADD COLUMN IF NOT EXISTS
  savings_rate NUMERIC;             -- 0.0-1.0

ALTER TABLE income_submissions ADD COLUMN IF NOT EXISTS
  composite_credit_score NUMERIC;   -- 0-100 (replaces simple nbfc_verdict)

ALTER TABLE income_submissions ADD COLUMN IF NOT EXISTS
  loan_eligibility_estimate NUMERIC; -- ₹ amount
```

---

## Updated Certificate PDF Layout

```
┌─────────────────────────────────────────────────────┐
│  GigPay                    GIG-2025-XXXXX           │
│  Income & Credit Analysis Certificate               │
├─────────────────────────────────────────────────────┤
│  WORKER: Chris D'Souza    STATEMENT: HDFC Bank      │
│  PERIOD: Jan–Jun 2025     ISSUED: 13 Jun 2025       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  CREDIT SCORE: 74/100  ████████████░░░░  MODERATE  │
│                                                     │
├──────────────┬──────────────┬───────────────────────┤
│ Avg Income   │ Debt Ratio   │ Savings Rate          │
│ ₹38,200/mo  │ 18%          │ 22%                   │
├──────────────┴──────────────┴───────────────────────┤
│  6-Month Cash Flow                                  │
│  ▓▓░  ▓▓░  ▓▓▓  ▓▓░  ▓▓▓  ▓▓░  (credits vs debits)│
├─────────────────────────────────────────────────────┤
│  LOAN ELIGIBILITY ESTIMATE: Up to ₹1,90,000         │
├──────────────────────────┬──────────────────────────┤
│  SHA-256: a3f9b2...      │  [QR CODE]               │
│  Verified 0× by lenders  │  Scan to verify          │
└──────────────────────────┴──────────────────────────┘
```

---

## Demo Plan (Your Real Bank/CC Statements)

Since we don't have gig worker statements:

1. **Upload your HDFC/SBI/Axis bank statement PDF** via the app
2. LLM will extract your real transaction data
3. App will compute credit signals from actual data
4. Certificate generated with real numbers
5. **Hackathon pitch framing**:  
   *"This demo uses a real bank statement to show our extraction engine working on live financial data. In production, gig platforms like Swiggy/Zomato would provide verified payout data via partner API, bypassing PDF upload entirely."*

> **Privacy**: Your statement PDF is sent to Supabase Edge Function (your own Supabase project), then to OpenRouter. It is NOT stored permanently — only the extracted JSON is saved to DB.

---

## New `expo-document-picker` Dependency

Needs to be installed:
```bash
npx expo install expo-document-picker
```

And added to `app.json` plugins if needed (check expo-document-picker docs for SDK 54).

---

## Implementation Order

- [ ] Install `expo-document-picker`
- [ ] Update `supabase/schema.sql` with new columns
- [ ] Write `supabase/functions/parse-statement/index.ts`
- [ ] Write `lib/credit-score.ts`
- [ ] Write `lib/pdf-extract.ts`
- [ ] Rewrite `app/(tabs)/upload.tsx` (PDF picker)
- [ ] Update `app/processing/[id].tsx` (already polls — no change needed)
- [ ] Rewrite `app/results/[id].tsx` (new credit score UI)
- [ ] Update `supabase/functions/generate-certificate/index.ts` (new PDF layout)
- [ ] Update `lib/types.ts` (new fields)
- [ ] Deploy new Edge Function
- [ ] End-to-end test with real PDF

---

## Files NOT Changing

- `app/_layout.tsx` — no change
- `app/(auth)/` — no change (auth already fixed)
- `app/certificate/[id].tsx` — minor update (show credit score)
- `app/verify/[id].tsx` — no change
- `lib/supabase.ts` — no change
- `lib/share.ts` — no change
- `lib/certificate.ts` — no change
- `constants/` — no change

---

*GigPay Phase 4 Plan — Prepared 13 Jun 2025*
