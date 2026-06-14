// app/verify/[id].tsx
// Public lender verification page — no auth required.
// Accessed by scanning QR code on the certificate PDF.

import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors, spacing, radius } from '../../constants/theme';

const SUPABASE_URL      = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const platformNames: Record<string, string> = {
  swiggy: 'Swiggy Delivery',
  zomato: 'Zomato Delivery',
  rapido: 'Rapido Captain',
  other:  'Gig Platform',
};

interface VerifyResult {
  valid: boolean;
  hash_verified: boolean;
  human_id: string;
  worker_name: string;
  platform: string;
  avg_monthly_income: number;
  trend_pct: number;
  consistency_score: number;
  nbfc_verdict: 'STRONG' | 'MODERATE' | 'WEAK';
  issued_at: string;
  verified_count: number;
  pdf_url: string;
  error?: string;
}

export default function VerifyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) verify();
  }, [id]);

  async function verify() {
    setLoading(true);
    try {
      // No Authorization header — this endpoint is public
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/verify-certificate?id=${encodeURIComponent(id)}`,
        {
          headers: { 'apikey': SUPABASE_ANON_KEY },
        }
      );
      const data = await response.json();
      setResult(data);
    } catch (e: any) {
      setResult({ valid: false, error: e.message } as any);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Verifying certificate...</Text>
        <Text style={styles.loadingSub}>Checking tamper evidence</Text>
      </View>
    );
  }

  if (!result?.valid) {
    return (
      <View style={styles.center}>
        <Text style={styles.invalidIcon}>❌</Text>
        <Text style={styles.invalidTitle}>Certificate Not Found</Text>
        <Text style={styles.invalidSub}>
          {result?.error ?? 'This certificate ID is invalid or has been revoked.'}
        </Text>
        <Text style={styles.invalidId}>{id}</Text>
      </View>
    );
  }

  const verdictConfig = {
    STRONG:   { color: colors.success, emoji: '💪', label: 'Strong — Good candidate for loan' },
    MODERATE: { color: colors.warning, emoji: '👍', label: 'Moderate — Review recommended' },
    WEAK:     { color: colors.danger,  emoji: '⚠️', label: 'Weak — High risk for lender' },
  };
  const verdict = verdictConfig[result.nbfc_verdict] ?? verdictConfig.WEAK;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Verified banner */}
      <View style={styles.verifiedBanner}>
        <Text style={styles.verifiedIcon}>✅</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.verifiedTitle}>Certificate Verified</Text>
          <Text style={styles.verifiedSub}>
            {result.hash_verified
              ? 'SHA-256 hash matches — data is unmodified'
              : '⚠️ Hash mismatch — data may have been altered'}
          </Text>
        </View>
      </View>

      {/* Certificate ID row */}
      <View style={styles.idRow}>
        <Text style={styles.idLabel}>Certificate ID</Text>
        <Text style={styles.idValue}>{result.human_id}</Text>
      </View>

      {/* Worker info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>WORKER INFORMATION</Text>
        <DetailRow label="Name"          value={result.worker_name} />
        <DetailRow label="Platform"      value={platformNames[result.platform] ?? result.platform} />
        <DetailRow
          label="Issued"
          value={new Date(result.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        />
        <DetailRow label="Times Verified" value={`${result.verified_count}×`} last />
      </View>

      {/* Income metrics */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>
            ₹{result.avg_monthly_income?.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.metricLabel}>Avg Monthly</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, { color: result.trend_pct >= 0 ? colors.success : colors.danger }]}>
            {result.trend_pct >= 0 ? '+' : ''}{result.trend_pct?.toFixed(1)}%
          </Text>
          <Text style={styles.metricLabel}>Trend</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, {
            color: result.consistency_score >= 80 ? colors.success
                 : result.consistency_score >= 60 ? colors.warning
                 : colors.danger
          }]}>
            {result.consistency_score}/100
          </Text>
          <Text style={styles.metricLabel}>Consistency</Text>
        </View>
      </View>

      {/* NBFC Verdict */}
      <View style={[styles.verdictBanner, { borderColor: verdict.color }]}>
        <Text style={styles.verdictEmoji}>{verdict.emoji}</Text>
        <View>
          <Text style={[styles.verdictLabel, { color: verdict.color }]}>{result.nbfc_verdict}</Text>
          <Text style={styles.verdictDesc}>{verdict.label}</Text>
        </View>
      </View>

      {/* Download PDF */}
      {result.pdf_url && (
        <TouchableOpacity
          style={styles.downloadBtn}
          onPress={() => Linking.openURL(result.pdf_url)}
        >
          <Text style={styles.downloadBtnText}>📄  Download Full Certificate PDF</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.footer}>
        Verified by GigPay · gigpay.app{'\n'}
        Certificate data is tamper-evident via SHA-256 hash
      </Text>

    </ScrollView>
  );
}

function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.detailRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.background },
  content:        { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  loadingText:    { fontSize: 16, color: colors.text, marginTop: spacing.md, fontWeight: '600' },
  loadingSub:     { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  invalidIcon:    { fontSize: 64, marginBottom: spacing.md },
  invalidTitle:   { fontSize: 22, fontWeight: 'bold', color: colors.danger, textAlign: 'center', marginBottom: 8 },
  invalidSub:     { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: spacing.sm },
  invalidId:      { fontSize: 12, color: colors.textMuted, fontFamily: 'monospace' },
  verifiedBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: '#F0FDF4', padding: spacing.md, borderRadius: radius.lg, borderWidth: 2, borderColor: colors.success, marginBottom: spacing.md },
  verifiedIcon:   { fontSize: 36 },
  verifiedTitle:  { fontSize: 17, fontWeight: '800', color: colors.success },
  verifiedSub:    { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  idRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  idLabel:        { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  idValue:        { fontSize: 13, color: colors.text, fontFamily: 'monospace', fontWeight: '700' },
  card:           { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  cardTitle:      { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8, marginBottom: spacing.sm },
  detailRow:      { flexDirection: 'row', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel:    { flex: 1, fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  detailValue:    { flex: 2, fontSize: 13, color: colors.text },
  metricsRow:     { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  metricCard:     { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  metricValue:    { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 2 },
  metricLabel:    { fontSize: 10, color: colors.textMuted, textAlign: 'center' },
  verdictBanner:  { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 2, marginBottom: spacing.md, backgroundColor: colors.card },
  verdictEmoji:   { fontSize: 32 },
  verdictLabel:   { fontSize: 17, fontWeight: '800' },
  verdictDesc:    { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  downloadBtn:    { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 16, alignItems: 'center', marginBottom: spacing.md },
  downloadBtnText:{ color: '#fff', fontSize: 15, fontWeight: '700' },
  footer:         { fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: spacing.md, lineHeight: 18 },
});
