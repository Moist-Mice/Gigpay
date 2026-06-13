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
