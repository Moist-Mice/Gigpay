# Supabase Edge Functions — Deploy Guide

## One-time Setup

You need to be logged into the Supabase CLI and have the project linked.

```bash
# Install Supabase CLI (if not already)
npx supabase login

# Link to your project (get Project Ref from Supabase Dashboard > Settings > General)
npx supabase link --project-ref gjdfdwxfxbkzeurgdcgh
```

## Deploy All Functions

```bash
npx supabase functions deploy parse-statement --no-verify-jwt
npx supabase functions deploy explain-income --no-verify-jwt
npx supabase functions deploy generate-certificate --no-verify-jwt
npx supabase functions deploy verify-certificate --no-verify-jwt
npx supabase functions deploy parse-screenshot --no-verify-jwt
```

Or all at once:
```bash
npx supabase functions deploy --no-verify-jwt
```

## Set Edge Function Secrets

In your Supabase Dashboard > Edge Functions > Secrets (or via CLI):

```bash
npx supabase secrets set OPENROUTER_API_KEY=sk-or-...
npx supabase secrets set CLERK_SECRET_KEY=sk_test_...
```

## Run Phase 4 Schema Migrations

Go to Supabase Dashboard > SQL Editor, paste and run the bottom section of `supabase/schema.sql`:

```sql
ALTER TABLE income_submissions ADD COLUMN IF NOT EXISTS
  statement_type TEXT CHECK (statement_type IN ('bank', 'credit_card', 'both'));
ALTER TABLE income_submissions ADD COLUMN IF NOT EXISTS income_stability_score NUMERIC;
ALTER TABLE income_submissions ADD COLUMN IF NOT EXISTS debt_to_income_ratio NUMERIC;
ALTER TABLE income_submissions ADD COLUMN IF NOT EXISTS savings_rate NUMERIC;
ALTER TABLE income_submissions ADD COLUMN IF NOT EXISTS composite_credit_score NUMERIC;
ALTER TABLE income_submissions ADD COLUMN IF NOT EXISTS loan_eligibility_estimate NUMERIC;
```

## Demo Mode (No API Key Needed)

The app has a **built-in demo fallback** — if `parse-statement` isn't deployed or `OPENROUTER_API_KEY` isn't set:

1. On the Upload tab → **long-press "PDF Select Karein" card** (hold 1.5s)
2. Mock bank data (HDFC-style, 6 months, ₹38k avg) loads directly into DB
3. Results screen shows full credit score breakdown
4. Certificate can be generated from results

> This means the full demo flow works **without any API key** for hackathon demos.
