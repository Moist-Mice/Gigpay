import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, radius } from '../constants/theme';
import type { MonthData, IncomeSubmission } from '../lib/types';
import { formatRupees, formatPeriod } from '../lib/intelligence';

// ── Overload 1: single month card (used in charts / breakdown) ───────────────
interface MonthCardProps {
  month: MonthData;
  avgMonthly?: number;
  submission?: never;
  onPress?: never;
}

// ── Overload 2: full submission card (used in home screen list) ──────────────
interface SubmissionCardProps {
  submission: IncomeSubmission;
  onPress?: () => void;
  month?: never;
  avgMonthly?: never;
}

type EarningsCardProps = MonthCardProps | SubmissionCardProps;

/**
 * Polymorphic card:
 * - Pass `month` to display a single MonthData row.
 * - Pass `submission` to display a full income submission summary (tappable).
 */
export function EarningsCard({ month, avgMonthly, submission, onPress }: EarningsCardProps) {
  // ── Submission card (home screen list) ──────────────────────────────────
  if (submission) {
    const verdictColor = {
      STRONG:   colors.success,
      MODERATE: colors.warning,
      WEAK:     colors.danger,
    }[submission.nbfc_verdict] ?? colors.textMuted;

    const platformLabel = {
      swiggy: '🟠 Swiggy',
      zomato: '🔴 Zomato',
      rapido: '🟡 Rapido',
      other:  '➕ Other',
    }[submission.platform] ?? submission.platform;

    const date = new Date(submission.created_at).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });

    return (
      <TouchableOpacity style={styles.subCard} onPress={onPress} activeOpacity={0.8}>
        <View style={styles.subLeft}>
          <Text style={styles.subPlatform}>{platformLabel}</Text>
          <Text style={styles.subDate}>{date} • {submission.months_data?.length ?? 0} months</Text>
          <Text style={styles.subAvg}>
            Avg: <Text style={styles.subAvgBold}>₹{submission.avg_monthly_income?.toLocaleString('en-IN')}</Text>
          </Text>
        </View>
        <View style={styles.subRight}>
          <View style={[styles.verdictBadge, { backgroundColor: verdictColor + '20', borderColor: verdictColor }]}>
            <Text style={[styles.verdictText, { color: verdictColor }]}>{submission.nbfc_verdict}</Text>
          </View>
          <Text style={styles.consistencyText}>{submission.consistency_score}% consistent</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // ── Month card (single MonthData row) ────────────────────────────────────
  const pctVsAvg = avgMonthly
    ? ((month!.amount - avgMonthly) / avgMonthly * 100).toFixed(0)
    : null;
  const isAbove = pctVsAvg ? Number(pctVsAvg) >= 0 : null;

  return (
    <View style={styles.card}>
      <View style={styles.left}>
        <Text style={styles.period}>{formatPeriod(month!.period)}</Text>
        {month!.trips !== undefined && (
          <Text style={styles.trips}>{month!.trips} trips</Text>
        )}
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>{formatRupees(month!.amount)}</Text>
        {pctVsAvg !== null && (
          <View style={[styles.badge, isAbove ? styles.badgeGreen : styles.badgeRed]}>
            <Text style={[styles.badgeText, isAbove ? styles.textGreen : styles.textRed]}>
              {isAbove ? '+' : ''}{pctVsAvg}% avg
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Single-month card
  card:             { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  left:             { flex: 1 },
  period:           { fontSize: 15, fontWeight: '700', color: colors.text },
  trips:            { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  right:            { alignItems: 'flex-end' },
  amount:           { fontSize: 18, fontWeight: '800', color: colors.text },
  badge:            { marginTop: 4, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeGreen:       { backgroundColor: '#DCFCE7' },
  badgeRed:         { backgroundColor: '#FEE2E2' },
  badgeText:        { fontSize: 11, fontWeight: '700' },
  textGreen:        { color: colors.success },
  textRed:          { color: colors.danger },

  // Submission card
  subCard:          { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  subLeft:          { flex: 1 },
  subPlatform:      { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 2 },
  subDate:          { fontSize: 12, color: colors.textMuted, marginBottom: 2 },
  subAvg:           { fontSize: 13, color: colors.textMuted },
  subAvgBold:       { fontWeight: '700', color: colors.text },
  subRight:         { alignItems: 'flex-end', gap: 4 },
  verdictBadge:     { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  verdictText:      { fontSize: 11, fontWeight: '800' },
  consistencyText:  { fontSize: 11, color: colors.textMuted },
});
