// lib/credit-score.ts
// 8-signal composite credit scoring engine for GigPay Phase 4

import type { StatementMonth, CreditSignals, CreditScore, ScoreBreakdown } from './types';

// ── Scoring Weights ───────────────────────────────────────────────────────────
const WEIGHTS = {
  incomeStability:        0.25,
  avgIncomeLevel:         0.25,
  debtToIncome:           0.20,
  savingsRate:            0.15,
  paymentDiscipline:      0.10,
  transactionRegularity:  0.05,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

// ── Main Scoring Function ─────────────────────────────────────────────────────

/** Compute an 8-signal composite credit score from bank statement months */
export function computeCreditScore(months: StatementMonth[]): CreditScore {
  if (!months || months.length === 0) {
    return emptyScore();
  }

  const credits = months.map(m => m.total_credits);
  const debits = months.map(m => m.total_debits);
  const emis = months.map(m => m.emi_payments);
  const avgCredits = credits.reduce((s, v) => s + v, 0) / credits.length;
  const avgDebits = debits.reduce((s, v) => s + v, 0) / debits.length;
  const avgEMI = emis.reduce((s, v) => s + v, 0) / emis.length;

  // Signal 1 — Income Stability (lower std dev = better)
  const creditStdDev = stdDev(credits);
  const cvRatio = avgCredits > 0 ? creditStdDev / avgCredits : 1;
  const incomeStabilityScore = clamp(Math.round((1 - cvRatio) * 100));

  // Signal 2 — Avg Income Level (score based on ₹15k baseline, maxes at ₹60k)
  const incomeLevel = avgCredits;
  const avgIncomeScore = clamp(Math.round(Math.min(avgCredits / 60000, 1) * 100));

  // Signal 3 — Debt-to-Income Ratio (lower = better; >50% = 0)
  const debtToIncomeRatio = avgCredits > 0 ? avgEMI / avgCredits : 0;
  const debtScore = clamp(Math.round((1 - Math.min(debtToIncomeRatio / 0.5, 1)) * 100));

  // Signal 4 — Savings Rate ((credits - debits) / credits)
  const savingsRateRaw = avgCredits > 0 ? (avgCredits - avgDebits) / avgCredits : 0;
  const savingsRate = Math.max(0, savingsRateRaw);
  const savingsScore = clamp(Math.round(Math.min(savingsRate / 0.3, 1) * 100));

  // Signal 5 — Gig Income Pattern detection
  const gigIncomePattern = months.some(m => m.gig_credits > 5 || m.upi_credits > 10);

  // Signal 6 — Credit Utilisation (N/A for bank; default good)
  const creditUtilisation = 0;

  // Signal 7 — Payment Discipline (did all months have EMIs if any?)
  const hasEMIs = emis.some(e => e > 0);
  const disciplineScore = hasEMIs
    ? clamp(Math.round((emis.filter(e => e > 0).length / months.length) * 100))
    : 100;

  // Signal 8 — Transaction Regularity (all months active?)
  const activeMonths = months.filter(m => m.total_credits > 0).length;
  const transactionRegularity = clamp(Math.round((activeMonths / months.length) * 100));

  const signals: CreditSignals = {
    avgMonthlyIncome: Math.round(incomeLevel),
    incomeStabilityScore,
    debtToIncomeRatio: Math.round(debtToIncomeRatio * 100) / 100,
    savingsRate: Math.round(savingsRate * 100) / 100,
    gigIncomePattern,
    creditUtilisation,
    paymentDiscipline: disciplineScore,
    transactionRegularity,
  };

  // Composite score (weighted sum)
  const composite = clamp(Math.round(
    incomeStabilityScore * WEIGHTS.incomeStability +
    avgIncomeScore * WEIGHTS.avgIncomeLevel +
    debtScore * WEIGHTS.debtToIncome +
    savingsScore * WEIGHTS.savingsRate +
    disciplineScore * WEIGHTS.paymentDiscipline +
    transactionRegularity * WEIGHTS.transactionRegularity
  ));

  // NBFC Verdict
  let nbfcVerdict: 'STRONG' | 'MODERATE' | 'WEAK' = 'WEAK';
  if (composite >= 75) nbfcVerdict = 'STRONG';
  else if (composite >= 50) nbfcVerdict = 'MODERATE';

  // Loan Eligibility Estimate: avgMonthly × multiplier based on score
  const multiplier = composite >= 75 ? 10 : composite >= 50 ? 7 : 4;
  const loanEligibilityEstimate = Math.min(
    Math.round(avgCredits * multiplier / 1000) * 1000,
    500000  // cap at ₹5L
  );

  const breakdown: ScoreBreakdown[] = [
    {
      label: 'Income Stability',
      score: incomeStabilityScore,
      weight: 25,
      emoji: '📈',
      color: incomeStabilityScore >= 70 ? '#16A34A' : incomeStabilityScore >= 45 ? '#D97706' : '#DC2626',
    },
    {
      label: 'Income Level',
      score: avgIncomeScore,
      weight: 25,
      emoji: '💰',
      color: avgIncomeScore >= 70 ? '#16A34A' : avgIncomeScore >= 45 ? '#D97706' : '#DC2626',
    },
    {
      label: 'Debt Ratio',
      score: debtScore,
      weight: 20,
      emoji: '🏦',
      color: debtScore >= 70 ? '#16A34A' : debtScore >= 45 ? '#D97706' : '#DC2626',
    },
    {
      label: 'Savings Rate',
      score: savingsScore,
      weight: 15,
      emoji: '💸',
      color: savingsScore >= 70 ? '#16A34A' : savingsScore >= 45 ? '#D97706' : '#DC2626',
    },
    {
      label: 'Payment Discipline',
      score: disciplineScore,
      weight: 10,
      emoji: '✅',
      color: disciplineScore >= 70 ? '#16A34A' : disciplineScore >= 45 ? '#D97706' : '#DC2626',
    },
    {
      label: 'Activity',
      score: transactionRegularity,
      weight: 5,
      emoji: '🔄',
      color: transactionRegularity >= 70 ? '#16A34A' : '#D97706',
    },
  ];

  return { composite, signals, nbfcVerdict, loanEligibilityEstimate, breakdown };
}

/** Empty score for when no data is available */
function emptyScore(): CreditScore {
  return {
    composite: 0,
    signals: {
      avgMonthlyIncome: 0,
      incomeStabilityScore: 0,
      debtToIncomeRatio: 0,
      savingsRate: 0,
      gigIncomePattern: false,
      creditUtilisation: 0,
      paymentDiscipline: 0,
      transactionRegularity: 0,
    },
    nbfcVerdict: 'WEAK',
    loanEligibilityEstimate: 0,
    breakdown: [],
  };
}

/** Convert StatementMonth[] to MonthData[] for backward compat charts */
export function toMonthData(months: StatementMonth[]) {
  return months.map(m => ({
    period: m.month,
    amount: m.total_credits,
  }));
}
