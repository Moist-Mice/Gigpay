// app/results/[id].tsx
import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors, spacing, radius } from '../../constants/theme';
import type { IncomeSubmission } from '../../lib/types';
import { ScoreBadge } from '../../components/ScoreBadge';
import { PlatformBadge } from '../../components/PlatformBadge';
import { IncomeChart } from '../../components/IncomeChart';

export default function ResultsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [submission, setSubmission] = useState<IncomeSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load submission from Supabase
  useEffect(() => {
    if (!id) return;
    loadSubmission();
  }, [id]);

  async function loadSubmission() {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('income_submissions')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      setSubmission(data as IncomeSubmission);
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

  // NBFC verdict display config
  const verdictConfig = {
    STRONG:   { color: colors.success,  emoji: '💪', label: 'Strong Profile',   sub: 'Loan eligibility: HIGH' },
    MODERATE: { color: colors.warning,  emoji: '👍', label: 'Moderate Profile', sub: 'Loan eligibility: MODERATE' },
    WEAK:     { color: colors.danger,   emoji: '⚠️', label: 'Weak Profile',     sub: 'Loan eligibility: LOW' },
  };
  const verdict = verdictConfig[submission.nbfc_verdict] ?? verdictConfig.WEAK;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Header */}
      <View style={styles.header}>
        <PlatformBadge platform={submission.platform} />
        <Text style={styles.title}>Income Analysis</Text>
        <Text style={styles.subtitle}>{submission.months_data?.length ?? 0} months analysed</Text>
      </View>

      {/* NBFC Verdict Banner */}
      <View style={[styles.verdictBanner, { borderColor: verdict.color, backgroundColor: verdict.color + '15' }]}>
        <Text style={styles.verdictEmoji}>{verdict.emoji}</Text>
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
          <ScoreBadge verdict={submission.nbfc_verdict} score={submission.consistency_score ?? 0} size="sm" />
          <Text style={styles.metricLabel}>Consistency</Text>
        </View>
      </View>

      {/* Income Bar Chart */}
      {submission.months_data && submission.months_data.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Monthly Earnings</Text>
          <IncomeChart months={submission.months_data} avgMonthly={submission.avg_monthly_income} />
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
          <Text style={styles.sectionTitle}>⚡ Notable Months</Text>
          {submission.seasonality_flags.map((flag, i) => (
            <Text key={i} style={styles.flagItem}>• {flag}</Text>
          ))}
        </View>
      )}

      {/* Generate Certificate CTA */}
      <TouchableOpacity
        style={styles.certCta}
        onPress={() => router.push(`/certificate/generate?submissionId=${id}` as any)}
        activeOpacity={0.85}
      >
        <Text style={styles.certCtaText}>📄 Certificate Banayein</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backLink} onPress={() => router.push('/(tabs)/home' as any)}>
        <Text style={styles.backLinkText}>← Home pe wapas jao</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.background },
  content:        { padding: spacing.md, paddingBottom: spacing.xl },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  loadingText:    { marginTop: spacing.md, color: colors.textMuted, fontSize: 15 },
  errorText:      { fontSize: 16, color: colors.danger, textAlign: 'center', marginBottom: spacing.md },
  header:         { marginBottom: spacing.md },
  title:          { fontSize: 26, fontWeight: 'bold', color: colors.text, marginTop: 4 },
  subtitle:       { fontSize: 13, color: colors.textMuted },
  verdictBanner:  { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 2, marginBottom: spacing.md },
  verdictEmoji:   { fontSize: 36 },
  verdictLabel:   { fontSize: 18, fontWeight: '800' },
  verdictSub:     { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  metricsRow:     { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  metricCard:     { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  metricValue:    { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 4 },
  metricLabel:    { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  chartCard:      { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  tableCard:      { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  sectionTitle:   { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  tableRow:       { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4, borderRadius: 6 },
  tableRowAlt:    { backgroundColor: colors.background },
  tableMonth:     { flex: 2, fontSize: 13, color: colors.text },
  tableAmount:    { flex: 2, fontSize: 13, fontWeight: '600', color: colors.text, textAlign: 'right' },
  tableDeviation: { flex: 1, fontSize: 12, textAlign: 'right', fontWeight: '600' },
  flagsCard:      { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  flagItem:       { fontSize: 13, color: colors.textMuted, marginBottom: 4 },
  certCta:        { backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 18, alignItems: 'center', marginBottom: spacing.sm, shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  certCtaText:    { color: '#fff', fontSize: 17, fontWeight: '800' },
  backBtn:        { backgroundColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, marginTop: spacing.md },
  backBtnText:    { color: colors.text, fontWeight: '600' },
  backLink:       { padding: spacing.md, alignItems: 'center' },
  backLinkText:   { color: colors.textMuted, fontSize: 14 },
});
