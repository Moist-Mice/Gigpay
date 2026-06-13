// app/results/[id].tsx — Phase 4: Credit Score UI with signal breakdown
import { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Animated,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/clerk';
import { computeCreditScore, toMonthData } from '../../lib/credit-score';
import { colors, spacing, radius } from '../../constants/theme';
import type { IncomeSubmission, CreditScore, StatementMonth } from '../../lib/types';
import { ScoreBadge } from '../../components/ScoreBadge';
import { PlatformBadge } from '../../components/PlatformBadge';
import { IncomeChart } from '../../components/IncomeChart';
import { IncomeExplainer } from '../../components/IncomeExplainer';
import {
  BankIcon,
  ShieldCheckIcon,
  ShieldAlertIcon,
  TrendingUpIcon,
  DollarIcon,
  PercentIcon,
  CheckIcon,
  SparklesIcon,
  AlertTriangleIcon,
  FileTextIcon,
  ArrowLeftIcon,
} from '../../components/Icons';

// ── Animated credit score ring ────────────────────────────────────────────────

function CreditRing({ score }: { score: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: score,
      duration: 1500,
      useNativeDriver: false,
    }).start();
    const id = anim.addListener(({ value }) => setDisplayScore(Math.round(value)));
    return () => anim.removeListener(id);
  }, [score]);

  const ringColor = score >= 75 ? colors.success : score >= 50 ? colors.warning : colors.danger;
  const verdict = score >= 75 ? 'STRONG' : score >= 50 ? 'MODERATE' : 'WEAK';

  const size = 180;
  const strokeWidth = 14;
  const radiusVal = (size - strokeWidth) / 2 - 10;
  const circumference = 2 * Math.PI * radiusVal;

  // Static offset at final score — no Animated.createAnimatedComponent needed
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <View style={styles.ringContainer}>
      <View style={styles.ringCard}>
        <Text style={styles.ringLabel}>GIGPAY CREDIT SCORE</Text>

        <View style={styles.svgWrapper}>
          <Svg width={size} height={size} style={styles.ringSvg}>
            <Defs>
              <LinearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={colors.primary} />
                <Stop offset="100%" stopColor={ringColor} />
              </LinearGradient>
            </Defs>
            {/* Track */}
            <Circle cx={size/2} cy={size/2} r={radiusVal}
              stroke="#1E2235" strokeWidth={strokeWidth - 2} fill="transparent" />
            {/* Progress — static SVG, no Animated wrapper */}
            <Circle cx={size/2} cy={size/2} r={radiusVal}
              stroke="url(#scoreGrad)" strokeWidth={strokeWidth} fill="transparent"
              strokeDasharray={`${circumference}`}
              strokeDashoffset={`${dashOffset}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${size/2} ${size/2})`}
            />
          </Svg>
          <View style={styles.ringCenterText}>
            <Text style={[styles.ringScoreNum, { color: ringColor }]}>{displayScore}</Text>
            <Text style={styles.ringScoreMax}>/100</Text>
          </View>
        </View>

        <View style={[styles.ringVerdict, { backgroundColor: ringColor + '12', borderColor: ringColor + '30' }]}>
          <Text style={[styles.ringVerdictText, { color: ringColor }]}>
            {verdict} PROFILE
          </Text>
        </View>
      </View>
    </View>
  );
}

function getSignalIcon(label: string, color: string) {
  switch (label) {
    case 'Income Stability':
      return <TrendingUpIcon size={20} color={color} strokeWidth={2.5} />;
    case 'Income Level':
      return <DollarIcon size={20} color={color} strokeWidth={2.5} />;
    case 'Debt Ratio':
      return <BankIcon size={20} color={color} strokeWidth={2.5} />;
    case 'Savings Rate':
      return <PercentIcon size={20} color={color} strokeWidth={2.5} />;
    case 'Payment Discipline':
      return <CheckIcon size={20} color={color} strokeWidth={2.5} />;
    default:
      return <SparklesIcon size={20} color={color} strokeWidth={2.5} />;
  }
}

// ── Score signal chip ─────────────────────────────────────────────────────────
function SignalChip({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <View style={[styles.signalChip, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <View style={{ marginBottom: 6 }}>
        {getSignalIcon(label, color)}
      </View>
      <Text style={[styles.signalScore, { color }]}>{score}</Text>
      <Text style={styles.signalLabel}>{label}</Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ResultsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getToken } = useAuth();
  const [submission, setSubmission] = useState<IncomeSubmission | null>(null);
  const [creditScore, setCreditScore] = useState<CreditScore | null>(null);
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    loadSubmission();
  }, [id]);

  async function loadSubmission() {
    setLoading(true);
    try {
      const [{ data, error: fetchError }, t] = await Promise.all([
        supabase.from('income_submissions').select('*').eq('id', id).single(),
        getToken(),
      ]);

      if (fetchError) throw fetchError;
      setSubmission(data as IncomeSubmission);
      setToken(t ?? '');

      // Compute credit score from raw data if Phase 4 fields missing
      const sub = data as IncomeSubmission;
      if (sub.composite_credit_score == null && sub.raw_parsed_json?.months) {
        const months = (sub.raw_parsed_json.months as StatementMonth[]);
        setCreditScore(computeCreditScore(months));
      } else if (sub.composite_credit_score != null) {
        // Build from stored fields
        const months = (sub.raw_parsed_json?.months ?? []) as StatementMonth[];
        setCreditScore(computeCreditScore(months.length > 0 ? months : []));
      }
    } catch (e: any) {
      setError(e.message ?? 'Failed to load results');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Results load ho rahe hain...</Text>
      </View>
    );
  }

  if (error || !submission) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>⚠️ {error || 'Results not found'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Phase 4 composite score — prefer stored, fallback to computed
  const compositeScore = submission.composite_credit_score
    ?? creditScore?.composite
    ?? submission.consistency_score
    ?? 0;

  const loanEligibility = submission.loan_eligibility_estimate
    ?? creditScore?.loanEligibilityEstimate
    ?? 0;

  const breakdown = creditScore?.breakdown ?? [];

  // Fallback chart months
  const chartMonths = (() => {
    const rawMonths = (submission.raw_parsed_json?.months ?? []) as StatementMonth[];
    if (rawMonths.length > 0) return toMonthData(rawMonths);
    return submission.months_data ?? [];
  })();

  const verdictConfig = {
    STRONG:   { color: colors.success,  emoji: '💪', label: 'Strong Profile',   sub: 'Loan eligibility: HIGH' },
    MODERATE: { color: colors.warning,  emoji: '👍', label: 'Moderate Profile', sub: 'Loan eligibility: MODERATE' },
    WEAK:     { color: colors.danger,   emoji: '⚠️', label: 'Weak Profile',     sub: 'Loan eligibility: LOW' },
  };
  const verdict = verdictConfig[submission.nbfc_verdict ?? 'WEAK'] ?? verdictConfig.WEAK;

  const isPhase4 = submission.composite_credit_score != null || submission.statement_type != null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Header */}
      <View style={styles.header}>
        <PlatformBadge platform={submission.platform} />
        <Text style={styles.title}>Income Analysis</Text>
        <Text style={styles.subtitle}>
          {submission.months_data?.length ?? 0} months analysed
          {submission.statement_type ? ` · ${submission.statement_type === 'bank' ? 'Bank Statement' : 'Credit Card'}` : ''}
        </Text>
      </View>

      {/* Phase 4: Credit Score Ring (if available) */}
      {isPhase4 && compositeScore > 0 && (
        <CreditRing score={Math.round(compositeScore)} />
      )}

      {/* Phase 4: Loan Eligibility row */}
      {isPhase4 && loanEligibility > 0 && (
        <View style={styles.loanRow}>
          <View style={styles.loanIconContainer}>
            <BankIcon size={24} color="#10B981" strokeWidth={2} />
          </View>
          <View>
            <Text style={styles.loanLabel}>Loan Eligibility Estimate</Text>
            <Text style={styles.loanValue}>₹{loanEligibility.toLocaleString('en-IN')} tak</Text>
          </View>
        </View>
      )}

      {/* Phase 4: Signal breakdown chips */}
      {breakdown.length > 0 && (
        <View style={styles.breakdownCard}>
          <Text style={styles.sectionTitle}>Score Breakdown</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
            {breakdown.map(b => (
              <SignalChip key={b.label} label={b.label} score={b.score} color={b.color} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* NBFC Verdict Banner (always shown) */}
      <View style={[styles.verdictBanner, { borderColor: verdict.color, backgroundColor: verdict.color + '10' }]}>
        <View style={styles.verdictIconContainer}>
          {submission.nbfc_verdict === 'WEAK' ? (
            <ShieldAlertIcon size={28} color={verdict.color} strokeWidth={2} />
          ) : (
            <ShieldCheckIcon size={28} color={verdict.color} strokeWidth={2} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.verdictLabel, { color: verdict.color }]}>{verdict.label}</Text>
          <Text style={styles.verdictSub}>{verdict.sub}</Text>
        </View>
      </View>

      {/* 3 Key Metrics */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>
            ₹{submission.avg_monthly_income?.toLocaleString('en-IN') ?? '—'}
          </Text>
          <Text style={styles.metricLabel}>Avg / Month</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[
            styles.metricValue,
            { color: (submission.trend_pct ?? 0) >= 0 ? colors.success : colors.danger }
          ]}>
            {(submission.trend_pct ?? 0) >= 0 ? '+' : ''}{submission.trend_pct?.toFixed(1) ?? '0'}%
          </Text>
          <Text style={styles.metricLabel}>Income Trend</Text>
        </View>
        <View style={styles.metricCard}>
          <ScoreBadge verdict={submission.nbfc_verdict ?? 'WEAK'} score={submission.consistency_score ?? 0} size="sm" />
          <Text style={styles.metricLabel}>Consistency</Text>
        </View>
      </View>

      {/* Phase 4: Debt ratio + savings rate row */}
      {isPhase4 && (
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {submission.debt_to_income_ratio != null
                ? `${Math.round(submission.debt_to_income_ratio * 100)}%`
                : creditScore?.signals.debtToIncomeRatio != null
                  ? `${Math.round(creditScore.signals.debtToIncomeRatio * 100)}%`
                  : '—'}
            </Text>
            <Text style={styles.metricLabel}>Debt Ratio</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {submission.savings_rate != null
                ? `${Math.round(submission.savings_rate * 100)}%`
                : creditScore?.signals.savingsRate != null
                  ? `${Math.round(creditScore.signals.savingsRate * 100)}%`
                  : '—'}
            </Text>
            <Text style={styles.metricLabel}>Savings Rate</Text>
          </View>
          <View style={styles.metricCard}>
            <View style={{ height: 26, justifyContent: 'center' }}>
              {creditScore?.signals.gigIncomePattern ? (
                <CheckIcon size={18} color={colors.success} strokeWidth={3} />
              ) : (
                <Text style={styles.metricValue}>—</Text>
              )}
            </View>
            <Text style={styles.metricLabel}>Gig Pattern</Text>
          </View>
        </View>
      )}

      {/* Income Bar Chart */}
      {chartMonths.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Monthly Cash Flow</Text>
          <IncomeChart months={chartMonths} avgMonthly={submission.avg_monthly_income} />
        </View>
      )}

      {/* Monthly Breakdown Table */}
      <View style={styles.tableCard}>
        <Text style={styles.sectionTitle}>Breakdown</Text>
        {(submission.months_data ?? []).map((month, i) => {
          const deviation = submission.avg_monthly_income > 0
            ? ((month.amount - submission.avg_monthly_income) / submission.avg_monthly_income * 100)
            : 0;
          const label = new Date(month.period + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
          return (
            <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
              <Text style={styles.tableMonth}>{label}</Text>
              <Text style={styles.tableAmount}>₹{month.amount.toLocaleString('en-IN')}</Text>
              <Text style={[styles.tableDeviation, { color: deviation >= 0 ? colors.success : colors.danger }]}>
                {deviation >= 0 ? '+' : ''}{deviation.toFixed(0)}%
              </Text>
            </View>
          );
        })}
      </View>

      {/* Seasonality flags */}
      {(submission.seasonality_flags ?? []).length > 0 && (
        <View style={styles.flagsCard}>
          <Text style={styles.sectionTitle}>Notable Months</Text>
          {submission.seasonality_flags.map((flag, i) => (
            <Text key={i} style={styles.flagItem}>• {flag}</Text>
          ))}
        </View>
      )}

      {/* Phase 4: Hindi AI Explainer */}
      {token ? (
        <IncomeExplainer submissionId={id!} token={token} />
      ) : null}

      {/* Generate Certificate CTA */}
      <TouchableOpacity
        style={styles.certCta}
        onPress={() => router.push(`/certificate/generate?submissionId=${id}` as any)}
        activeOpacity={0.85}
      >
        <Text style={styles.certCtaText}>Certificate Banayein</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backLink} onPress={() => router.push('/(tabs)/home' as any)} activeOpacity={0.7}>
        <ArrowLeftIcon size={14} color={colors.textMuted} strokeWidth={2.5} />
        <Text style={styles.backLinkText}>Home pe wapas jao</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.background },
  content:         { padding: spacing.md, paddingBottom: spacing.xl },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  loadingText:     { marginTop: spacing.md, color: colors.textMuted, fontSize: 15 },
  errorText:       { fontSize: 16, color: colors.danger, textAlign: 'center', marginBottom: spacing.md },
  header:          { marginBottom: spacing.md },
  title:           { fontSize: 26, fontWeight: 'bold', color: colors.text, marginTop: 4 },
  subtitle:        { fontSize: 13, color: colors.textMuted },
  // Credit Ring
  ringContainer:   { alignItems: 'center', marginBottom: spacing.md, width: '100%' },
  ringCard:        { width: '100%', backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  ringLabel:       { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: spacing.md },
  svgWrapper:      { position: 'relative', width: 180, height: 180, justifyContent: 'center', alignItems: 'center' },
  ringSvg:         { position: 'absolute' },
  ringCenterText:  { alignItems: 'center', justifyContent: 'center' },
  ringScoreNum:    { fontSize: 44, fontWeight: '900', lineHeight: 48 },
  ringScoreMax:    { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  ringVerdict:     { borderRadius: 20, paddingHorizontal: spacing.md, paddingVertical: 6, marginTop: spacing.md, borderWidth: 1 },
  ringVerdictText: { fontSize: 13, fontWeight: '800' },
  // Loan row
  loanRow:         { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: '#0B251B', borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: '#10B98135' },
  loanIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(16, 185, 129, 0.15)', justifyContent: 'center', alignItems: 'center' },
  loanLabel:       { fontSize: 11, color: colors.success, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  loanValue:       { fontSize: 20, fontWeight: '900', color: colors.success },
  // Signal breakdown
  breakdownCard:   { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  chipsScroll:     { marginTop: spacing.sm },
  signalChip:      { width: 96, alignItems: 'center', padding: 12, borderRadius: radius.md, marginRight: spacing.sm, borderWidth: 1 },
  signalScore:     { fontSize: 20, fontWeight: '900', marginTop: 4 },
  signalLabel:     { fontSize: 10, color: colors.textMuted, textAlign: 'center', marginTop: 4, lineHeight: 13 },
  // Verdict
  verdictBanner:   { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md },
  verdictIconContainer: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255, 255, 255, 0.03)', justifyContent: 'center', alignItems: 'center' },
  verdictLabel:    { fontSize: 16, fontWeight: '800' },
  verdictSub:      { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  // Metrics
  metricsRow:      { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  metricCard:      { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  metricValue:     { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 4 },
  metricLabel:     { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  // Chart
  chartCard:       { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  // Table
  tableCard:       { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  sectionTitle:    { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  tableRow:        { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4, borderRadius: 6 },
  tableRowAlt:     { backgroundColor: colors.background },
  tableMonth:      { flex: 2, fontSize: 13, color: colors.text },
  tableAmount:     { flex: 2, fontSize: 13, fontWeight: '600', color: colors.text, textAlign: 'right' },
  tableDeviation:  { flex: 1, fontSize: 12, textAlign: 'right', fontWeight: '600' },
  // Flags
  flagsCard:       { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  flagItem:        { fontSize: 13, color: colors.textMuted, marginBottom: 4 },
  // CTAs
  certCta:         { backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 18, alignItems: 'center', marginBottom: spacing.sm, shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  certCtaText:     { color: '#fff', fontSize: 17, fontWeight: '800' },
  backBtn:         { backgroundColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, marginTop: spacing.md },
  backBtnText:     { color: colors.text, fontWeight: '600' },
  backLink:        { padding: spacing.md, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  backLinkText:    { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
});
