// Income Intelligence Engine — trend, consistency, seasonality, NBFC verdict
import { MonthData } from './types';

export interface IncomeAnalysis {
  avg_monthly: number;
  trend_pct: number;           // positive = growing
  consistency_score: number;   // 0–100
  best_month: string;
  worst_month: string;
  seasonality_flags: string[]; // e.g. ["Oct 2024: +34%"]
  nbfc_verdict: 'STRONG' | 'MODERATE' | 'WEAK';
}

/**
 * Analyses an array of monthly earnings and returns income intelligence metrics.
 * All math is client-side so results are instant and work offline.
 */
export function analyseIncome(earnings: MonthData[]): IncomeAnalysis {
  // Sort chronologically so trend is time-ordered
  const sorted = [...earnings].sort((a, b) => a.period.localeCompare(b.period));
  const amounts = sorted.map(e => e.amount);
  const n = amounts.length;

  if (n === 0) {
    return {
      avg_monthly: 0,
      trend_pct: 0,
      consistency_score: 0,
      best_month: '',
      worst_month: '',
      seasonality_flags: [],
      nbfc_verdict: 'WEAK',
    };
  }

  // --- Average ---
  const avg = amounts.reduce((s, a) => s + a, 0) / n;

  // --- Trend: linear regression slope as % of mean ---
  const xMean = (n - 1) / 2;
  let num = 0, den = 0;
  amounts.forEach((y, i) => {
    num += (i - xMean) * (y - avg);
    den += (i - xMean) ** 2;
  });
  const slope = den === 0 ? 0 : num / den;
  const trend_pct = avg === 0 ? 0 : (slope / avg) * 100;

  // --- Consistency: % of months where amount >= 80% of average ---
  const consistentMonths = amounts.filter(a => a >= avg * 0.8).length;
  const consistency_score = Math.round((consistentMonths / n) * 100);

  // --- Seasonality: flag months with >20% deviation from avg ---
  const seasonality_flags = sorted
    .filter(m => Math.abs(m.amount - avg) / avg > 0.2)
    .map(m => {
      const dev = ((m.amount - avg) / avg * 100).toFixed(0);
      const label = new Date(m.period + '-01').toLocaleDateString('en-IN', {
        month: 'short',
        year: 'numeric',
      });
      return `${label}: ${Number(dev) >= 0 ? '+' : ''}${dev}%`;
    });

  // --- NBFC Verdict ---
  let nbfc_verdict: 'STRONG' | 'MODERATE' | 'WEAK' = 'WEAK';
  if (consistency_score >= 80 && trend_pct >= 0) nbfc_verdict = 'STRONG';
  else if (consistency_score >= 60) nbfc_verdict = 'MODERATE';

  // --- Best / Worst months ---
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

/**
 * Format a MonthData period string (YYYY-MM) to a human-readable month label.
 */
export function formatPeriod(period: string): string {
  return new Date(period + '-01').toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format a rupee amount with ₹ symbol and Indian number formatting.
 */
export function formatRupees(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN');
}

// Demo data for Raju Kumar — bypass camera mode
export const DEMO_MONTHS: MonthData[] = [
  { period: '2025-01', amount: 16800, trips: 212 },
  { period: '2025-02', amount: 17200, trips: 218 },
  { period: '2025-03', amount: 18100, trips: 229 },
  { period: '2025-04', amount: 17900, trips: 226 },
  { period: '2025-05', amount: 19200, trips: 243 },
  { period: '2025-06', amount: 18400, trips: 233 },
];
// avg: ₹17,933 | trend: +2.3% | consistency: 100% | verdict: STRONG
