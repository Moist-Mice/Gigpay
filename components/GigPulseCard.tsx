// components/GigPulseCard.tsx
// Novel Feature: AI-powered seasonal income pattern analysis
// Shows WHY income varies — turns volatility into a creditworthiness SIGNAL

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Animated } from 'react-native';
import { colors, spacing, radius } from '../constants/theme';
import { SparklesIcon, TrendingUpIcon, AlertTriangleIcon } from './Icons';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

interface GigPulseResult {
  pattern_type: 'FESTIVAL_DRIVEN' | 'WEATHER_DRIVEN' | 'SALARY_STABLE' | 'GROWING' | 'DECLINING' | 'IRREGULAR';
  high_months: string[];
  low_months: string[];
  insight_hindi: string;
  insight_english: string;
  reliability_signal: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  badge_text: string;
}

interface Props {
  submissionId: string;
  token: string;
  monthsData: { period: string; amount: number }[];
}

const PATTERN_CONFIG = {
  FESTIVAL_DRIVEN: { emoji: '🪔', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.08)', label: 'Festival-Driven' },
  WEATHER_DRIVEN:  { emoji: '🌧️', color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.08)', label: 'Weather-Driven' },
  SALARY_STABLE:   { emoji: '💎', color: '#10B981', bg: 'rgba(16, 185, 129, 0.08)', label: 'Salary-Stable' },
  GROWING:         { emoji: '📈', color: '#34D399', bg: 'rgba(52, 211, 153, 0.08)', label: 'Growing' },
  DECLINING:       { emoji: '📉', color: '#F87171', bg: 'rgba(248, 113, 113, 0.08)', label: 'Declining' },
  IRREGULAR:       { emoji: '〰️', color: '#A78BFA', bg: 'rgba(167, 139, 250, 0.08)', label: 'Irregular' },
};

const SIGNAL_CONFIG = {
  POSITIVE: { color: '#10B981', label: 'POSITIVE SIGNAL', icon: '✅' },
  NEUTRAL:  { color: '#F59E0B', label: 'NEUTRAL',         icon: '➖' },
  NEGATIVE: { color: '#F87171', label: 'NEEDS ATTENTION', icon: '⚠️' },
};

export function GigPulseCard({ submissionId, token, monthsData }: Props) {
  const [result, setResult] = useState<GigPulseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fadeAnim] = useState(new Animated.Value(0));

  async function fetchGigPulse() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/gigpulse`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ submission_id: submissionId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `GigPulse failed: ${res.status}`);
      }

      const data = await res.json() as GigPulseResult;
      setResult(data);
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    } catch (e: any) {
      setError(e.message ?? 'GigPulse analysis failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (submissionId && token && monthsData.length > 0) {
      fetchGigPulse();
    }
  }, [submissionId, token]);

  const pattern = result ? PATTERN_CONFIG[result.pattern_type] ?? PATTERN_CONFIG.IRREGULAR : null;
  const signal  = result ? SIGNAL_CONFIG[result.reliability_signal] ?? SIGNAL_CONFIG.NEUTRAL : null;

  // Render a bar chart of months inline
  const maxAmount = monthsData.length > 0 ? Math.max(...monthsData.map(m => m.amount)) : 1;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <SparklesIcon size={18} color={colors.primary} strokeWidth={2} />
          <Text style={styles.headerTitle}>GigPulse™ Analysis</Text>
        </View>
        <View style={styles.noveltBadge}>
          <Text style={styles.noveltyText}>AI POWERED</Text>
        </View>
      </View>

      {/* Loading */}
      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Income pattern analyse ho raha hai...</Text>
        </View>
      )}

      {/* Error */}
      {error && !loading && (
        <View style={styles.errorBox}>
          <AlertTriangleIcon size={16} color={colors.danger} strokeWidth={2} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchGigPulse} style={styles.retryBtn}>
            <Text style={styles.retryText}>↻ Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Result */}
      {result && pattern && signal && (
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* Pattern badge row */}
          <View style={[styles.patternRow, { backgroundColor: pattern.bg, borderColor: pattern.color + '40' }]}>
            <Text style={styles.patternEmoji}>{pattern.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.patternLabel, { color: pattern.color }]}>
                {result.badge_text}
              </Text>
              <Text style={styles.patternType}>{pattern.label} Pattern</Text>
            </View>
            <View style={[styles.signalPill, { backgroundColor: signal.color + '18', borderColor: signal.color + '40' }]}>
              <Text style={[styles.signalText, { color: signal.color }]}>
                {signal.icon} {signal.label}
              </Text>
            </View>
          </View>

          {/* Mini bar chart with month labels */}
          {monthsData.length > 0 && (
            <View style={styles.chartRow}>
              {monthsData.map((m, i) => {
                const heightPct = maxAmount > 0 ? (m.amount / maxAmount) : 0;
                const barH = Math.max(4, Math.round(48 * heightPct));
                const isHigh = result.high_months.some(h =>
                  new Date(m.period + '-01').toLocaleDateString('en-US', { month: 'short' }) === h
                );
                const isLow = result.low_months.some(l =>
                  new Date(m.period + '-01').toLocaleDateString('en-US', { month: 'short' }) === l
                );
                const barColor = isHigh ? '#F59E0B' : isLow ? '#60A5FA' : pattern.color;
                const monthLabel = new Date(m.period + '-01').toLocaleDateString('en-IN', { month: 'short' });
                return (
                  <View key={i} style={styles.barWrapper}>
                    <View style={styles.barContainer}>
                      {isHigh && <Text style={styles.barTag}>🔥</Text>}
                      {isLow && <Text style={styles.barTag}>❄️</Text>}
                      <View style={[styles.bar, { height: barH, backgroundColor: barColor }]} />
                    </View>
                    <Text style={styles.barLabel}>{monthLabel}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* High/low month tags */}
          {(result.high_months.length > 0 || result.low_months.length > 0) && (
            <View style={styles.tagsRow}>
              {result.high_months.length > 0 && (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>🔥 High: {result.high_months.join(', ')}</Text>
                </View>
              )}
              {result.low_months.length > 0 && (
                <View style={[styles.tag, { backgroundColor: 'rgba(96, 165, 250, 0.12)', borderColor: 'rgba(96, 165, 250, 0.3)' }]}>
                  <Text style={[styles.tagText, { color: '#60A5FA' }]}>❄️ Low: {result.low_months.join(', ')}</Text>
                </View>
              )}
            </View>
          )}

          {/* Hindi insight */}
          <View style={styles.insightBox}>
            <Text style={styles.insightLabel}>AI Analysis</Text>
            <Text style={styles.insightText}>{result.insight_hindi}</Text>
            {result.insight_english && (
              <Text style={styles.insightEnglish}>"{result.insight_english}"</Text>
            )}
          </View>

          {/* Novel tech callout */}
          <View style={styles.techNote}>
            <TrendingUpIcon size={12} color={colors.textMuted} strokeWidth={2} />
            <Text style={styles.techNoteText}>
              GigPay is the only credit tool that treats seasonal income as a reliability signal, not a risk.
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, overflow: 'hidden' },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerLeft:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle:   { fontSize: 15, fontWeight: '800', color: colors.text },
  noveltBadge:   { backgroundColor: 'rgba(255, 122, 0, 0.15)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(255, 122, 0, 0.3)' },
  noveltyText:   { fontSize: 9, fontWeight: '800', color: colors.primary, letterSpacing: 1 },
  loadingBox:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  loadingText:   { color: colors.textMuted, fontSize: 13, fontStyle: 'italic' },
  errorBox:      { flexDirection: 'row', alignItems: 'center', gap: 6, padding: spacing.md, flexWrap: 'wrap' },
  errorText:     { color: colors.danger, fontSize: 12, flex: 1 },
  retryBtn:      { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.card, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  retryText:     { color: colors.primary, fontSize: 12, fontWeight: '700' },
  patternRow:    { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, margin: spacing.md, marginBottom: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1 },
  patternEmoji:  { fontSize: 28 },
  patternLabel:  { fontSize: 14, fontWeight: '800' },
  patternType:   { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  signalPill:    { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  signalText:    { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  chartRow:      { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', paddingHorizontal: spacing.md, paddingBottom: 4, height: 72 },
  barWrapper:    { alignItems: 'center', flex: 1 },
  barContainer:  { alignItems: 'center', justifyContent: 'flex-end', height: 52 },
  barTag:        { fontSize: 10, marginBottom: 2 },
  bar:           { width: 14, borderRadius: 4, minHeight: 4 },
  barLabel:      { fontSize: 9, color: colors.textMuted, marginTop: 4 },
  tagsRow:       { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.md, marginBottom: spacing.sm, flexWrap: 'wrap' },
  tag:           { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)' },
  tagText:       { fontSize: 11, color: '#F59E0B', fontWeight: '600' },
  insightBox:    { marginHorizontal: spacing.md, marginBottom: spacing.sm, padding: spacing.sm, backgroundColor: colors.background, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  insightLabel:  { fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5, marginBottom: 4, textTransform: 'uppercase' },
  insightText:   { fontSize: 13, lineHeight: 20, color: colors.text },
  insightEnglish:{ fontSize: 11, color: colors.textMuted, fontStyle: 'italic', marginTop: 6 },
  techNote:      { flexDirection: 'row', alignItems: 'flex-start', gap: 6, padding: spacing.md, paddingTop: 0 },
  techNoteText:  { fontSize: 10, color: colors.textMuted, flex: 1, lineHeight: 14, fontStyle: 'italic' },
});
