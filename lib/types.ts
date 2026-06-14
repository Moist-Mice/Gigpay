// Core TypeScript interfaces for GigPay — all data shapes

export interface User {
  id: string;
  clerk_user_id: string;
  phone: string;
  name: string;
  platform: 'swiggy' | 'zomato' | 'rapido' | 'other';
  created_at: string;
}

export interface MonthData {
  period: string;   // "YYYY-MM"
  amount: number;   // INR integer
  trips?: number;
  label?: string;   // e.g. "October 2024"
}

export interface IncomeSubmission {
  id: string;
  user_id: string;
  platform: string;
  screenshot_url: string;
  raw_parsed_json?: Record<string, unknown>;
  months_data: MonthData[];
  avg_monthly_income: number;
  trend_pct: number;
  consistency_score: number;
  seasonality_flags: string[];
  nbfc_verdict: 'STRONG' | 'MODERATE' | 'WEAK';
  status: 'processing' | 'complete' | 'failed';
  error_message?: string;
  created_at: string;
  // Phase 4 — Bank Statement Credit Scoring fields (optional, null for old submissions)
  statement_type?: 'bank' | 'credit_card' | 'both';
  income_stability_score?: number;
  debt_to_income_ratio?: number;
  savings_rate?: number;
  composite_credit_score?: number;
  loan_eligibility_estimate?: number;
}

export interface Certificate {
  id: string;
  human_id: string;        // e.g. "GIG-2024-AB123"
  submission_id: string;
  user_id: string;
  pdf_url: string;
  sha256_hash: string;
  qr_data: string;
  issued_at: string;
  verified_count: number;
}

export interface VerificationResult {
  valid: boolean;
  worker_name: string;
  platform: string;
  avg_monthly_income: number;
  consistency_score: number;
  trend_pct: number;
  nbfc_verdict: 'STRONG' | 'MODERATE' | 'WEAK';
  hash_verified: boolean;
  verified_count: number;
}

// Parsed response from MiniMax M3 screenshot analysis
export interface ParsedScreenshot {
  platform: string;
  currency: 'INR';
  earnings: MonthData[];
  total_visible: number;
  data_quality: 'high' | 'medium' | 'low';
  notes?: string;
  error?: string;
}

// ── Phase 4: Bank Statement Credit Scoring ──────────────────────────────────

/** One month's data extracted from a bank/CC statement */
export interface StatementMonth {
  month: string;              // "YYYY-MM"
  total_credits: number;      // total money in
  total_debits: number;       // total money out
  emi_payments: number;       // recurring fixed debits (loan EMIs)
  upi_credits: number;        // UPI credit count (gig payment frequency)
  closing_balance: number;
  salary_credits: number;     // large single credits (formal salary)
  gig_credits: number;        // small frequent credits (gig pattern)
}

/** 8 credit signals computed from statement data */
export interface CreditSignals {
  avgMonthlyIncome: number;          // avg total_credits
  incomeStabilityScore: number;      // 0-100: lower std dev = higher score
  debtToIncomeRatio: number;         // emi_payments / avg_credits
  savingsRate: number;               // (credits - debits) / credits
  gigIncomePattern: boolean;         // frequent small credits detected
  creditUtilisation: number;         // CC: avg utilisation %
  paymentDiscipline: number;         // 0-100: no missed payments = 100
  transactionRegularity: number;     // 0-100: consistent month-to-month
}

/** One breakdown item for the UI score card */
export interface ScoreBreakdown {
  label: string;
  score: number;      // 0-100
  weight: number;     // % weight in composite
  emoji: string;
  color: string;
}

/** Full credit score result */
export interface CreditScore {
  composite: number;                  // 0-100 overall score
  signals: CreditSignals;
  nbfcVerdict: 'STRONG' | 'MODERATE' | 'WEAK';
  loanEligibilityEstimate: number;    // ₹ max loan amount
  breakdown: ScoreBreakdown[];
}

/** LLM extraction result from bank statement PDF */
export interface ParsedStatement {
  account_holder: string;
  bank_name: string;
  statement_period: { from: string; to: string };
  months: StatementMonth[];
  credit_card?: {
    credit_limit: number;
    avg_utilisation_pct: number;
    min_payment_missed: boolean;
  };
  error?: string;
}
