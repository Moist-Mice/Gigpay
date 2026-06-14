import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, radius } from '../constants/theme';
import type { MonthData, IncomeSubmission } from '../lib/types';
import { formatRupees, formatPeriod } from '../lib/intelligence';
import { PlatformBadge } from './PlatformBadge';
import { ScoreBadge } from './ScoreBadge';

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
    const date = new Date(submission.created_at).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });

    return (
      <TouchableOpacity style={styles.subCard} onPress={onPress} activeOpacity={0.85}>
        <View style={styles.subLeft}>
          <PlatformBadge platform={submission.platform} size="sm" />
          <Text style={styles.subDate}>{date} • {submission.months_data?.length ?? 0} months</Text>
          <Text style={styles.subAvg}>
            Avg Income: <Text style={styles.subAvgBold}>₹{submission.avg_monthly_income?.toLocaleString('en-IN')}</Text>
          </Text>
        </View>
        <View style={styles.subRight}>
          <ScoreBadge verdict={submission.nbfc_verdict} size="sm" />
          <Text style={styles.consistencyText}>
            {submission.composite_credit_score ?? submission.consistency_score}% score
          </Text>
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
  period:           { fontSize: 14, fontWeight: '700', color: colors.text },
  trips:            { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  right:            { alignItems: 'flex-end' },
  amount:           { fontSize: 16, fontWeight: '800', color: colors.text },
  badge:            { marginTop: 4, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeGreen:       { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
  badgeRed:         { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  badgeText:        { fontSize: 10, fontWeight: '800' },
  textGreen:        { color: colors.success },
  textRed:          { color: colors.danger },

  // Submission card
  subCard:          { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  subLeft:          { flex: 1, gap: 5 },
  subPlatform:      { fontSize: 14, fontWeight: '700', color: colors.text },
  subDate:          { fontSize: 11, color: colors.textMuted },
  subAvg:           { fontSize: 12, color: colors.textMuted },
  subAvgBold:       { fontWeight: '700', color: colors.text },
  subRight:         { alignItems: 'flex-end', gap: 6 },
  consistencyText:  { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
});

