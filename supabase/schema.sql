-- GigPay Database Schema
-- Run this entire file in the Supabase SQL Editor (project settings > SQL Editor)
-- Region: ap-south-1 (Mumbai)
-- Auth: Clerk (NOT Supabase Auth) — clerk_user_id is TEXT, no FK to auth.users

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id   TEXT UNIQUE NOT NULL,  -- Clerk's user ID (e.g. "user_abc123")
  phone           TEXT UNIQUE NOT NULL,  -- +91XXXXXXXXXX format
  name            TEXT,
  platform        TEXT CHECK (platform IN ('swiggy', 'zomato', 'rapido', 'other')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INCOME SUBMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS income_submissions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
  platform            TEXT,
  screenshot_url      TEXT,
  raw_parsed_json     JSONB,
  months_data         JSONB,
  avg_monthly_income  NUMERIC,
  trend_pct           NUMERIC,
  consistency_score   NUMERIC,
  seasonality_flags   JSONB DEFAULT '[]',
  nbfc_verdict        TEXT CHECK (nbfc_verdict IN ('STRONG', 'MODERATE', 'WEAK')),
  status              TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'complete', 'failed')),
  error_message       TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CERTIFICATES
-- ============================================================
CREATE TABLE IF NOT EXISTS certificates (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  human_id       TEXT UNIQUE NOT NULL,  -- e.g. "GIG-2025-AB123"
  submission_id  UUID REFERENCES income_submissions(id),
  user_id        UUID REFERENCES users(id),
  pdf_url        TEXT,
  sha256_hash    TEXT NOT NULL,
  qr_data        TEXT,
  issued_at      TIMESTAMPTZ DEFAULT NOW(),
  verified_count INT DEFAULT 0
);

-- ============================================================
-- VERIFICATIONS (lender QR scan log)
-- ============================================================
CREATE TABLE IF NOT EXISTS verifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  certificate_id  UUID REFERENCES certificates(id),
  verified_at     TIMESTAMPTZ DEFAULT NOW(),
  verifier_ip     TEXT
);

-- ============================================================
-- RLS — DISABLED
-- Auth is enforced at Edge Function layer via Clerk JWT.
-- Edge Functions use the service role key and verify Clerk JWTs themselves.
-- ============================================================
ALTER TABLE users              DISABLE ROW LEVEL SECURITY;
ALTER TABLE income_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE certificates       DISABLE ROW LEVEL SECURITY;
ALTER TABLE verifications      DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- STORAGE BUCKETS
-- Create these manually in Supabase Dashboard > Storage:
--   screenshots  — Private, 10MB max, MIME: image/jpeg,image/png,image/webp
--   pdfs         — Public,  5MB max,  MIME: application/pdf
-- ============================================================
