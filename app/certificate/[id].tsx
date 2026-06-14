// app/certificate/[id].tsx
// Full certificate viewer: worker details, metrics, QR code, share + download.
// This is the screen users show to lenders.

import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '../../lib/supabase';
import { sharePDF, openVerifyUrl } from '../../lib/share';
import { platformNames, maskPhone } from '../../lib/certificate';
import { colors, spacing, radius } from '../../constants/theme';
import type { Certificate, IncomeSubmission, User } from '../../lib/types';

interface CertificateWithDetails extends Certificate {
  submission: IncomeSubmission;
  user: User;
}

export default function CertificateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<CertificateWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) loadCertificate();
  }, [id]);

  async function loadCertificate() {
    setLoading(true);
    try {
      const { data: cert, error: certError } = await supabase
        .from('certificates')
        .select(`
          *,
          income_submissions (*),
          users (*)
        `)
        .eq('id', id)
        .single();

      if (certError || !cert) throw new Error('Certificate not found');

      setData({
        ...cert,
        submission: cert.income_submissions as unknown as IncomeSubmission,
        user: cert.users as unknown as User,
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleShare() {
    if (!data) return;
    setSharing(true);
    try {
      await sharePDF(data.pdf_url, data.human_id);
    } catch {
      // error already shown in sharePDF via Alert
    } finally {
      setSharing(false);
    }
  }

  async function handleShareLink() {
    if (!data) return;
    await Share.share({
      message: `Verify my GigPay income certificate: ${data.qr_data}`,
      url: data.qr_data,
      title: `GigPay Certificate ${data.human_id}`,
    });
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading certificate...</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>⚠️ {error || 'Certificate not found'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sub  = data.submission;
  const user = data.user;

  const verdictConfig = {
    STRONG:   { color: colors.success, emoji: '💪', label: 'Strong Income' },
    MODERATE: { color: colors.warning, emoji: '👍', label: 'Moderate Income' },
    WEAK:     { color: colors.danger,  emoji: '⚠️', label: 'Weak Income' },
  };
  const verdict = verdictConfig[sub.nbfc_verdict] ?? verdictConfig.WEAK;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Orange header bar (mirrors PDF layout) */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>GigPay</Text>
          <Text style={styles.headerSub}>Income Verification Certificate</Text>
        </View>
        <Text style={styles.certId}>{data.human_id}</Text>
      </View>

      {/* Worker details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>WORKER DETAILS</Text>
        <DetailRow label="Name"     value={user.name} />
        <DetailRow label="Phone"    value={maskPhone(user.phone)} />
        <DetailRow label="Platform" value={platformNames[sub.platform] ?? sub.platform} />
        <DetailRow
          label="Issued"
          value={new Date(data.issued_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          last
        />
      </View>

      {/* NBFC Verdict banner */}
      <View style={[styles.verdictBanner, { borderColor: verdict.color }]}>
        <Text style={styles.verdictEmoji}>{verdict.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.verdictLabel, { color: verdict.color }]}>
            {verdict.label}
          </Text>
          <Text style={styles.verdictSub}>NBFC loan eligibility: {sub.nbfc_verdict}</Text>
        </View>
      </View>

      {/* 3 metric cards */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>
            ₹{sub.avg_monthly_income?.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.metricLabel}>Avg / Month</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, { color: (sub.trend_pct ?? 0) >= 0 ? colors.success : colors.danger }]}>
            {(sub.trend_pct ?? 0) >= 0 ? '+' : ''}{sub.trend_pct?.toFixed(1)}%
          </Text>
          <Text style={styles.metricLabel}>Trend</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, {
            color: sub.consistency_score >= 80 ? colors.success
                 : sub.consistency_score >= 60 ? colors.warning
                 : colors.danger
          }]}>
            {sub.consistency_score}/100
          </Text>
          <Text style={styles.metricLabel}>Consistency</Text>
        </View>
      </View>

      {/* QR Code + tamper evidence */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>TAMPER EVIDENCE</Text>
        <View style={styles.tamperRow}>
          <View style={styles.qrContainer}>
            <QRCode
              value={data.qr_data || `gigpay://verify/${data.human_id}`}
              size={110}
              color={colors.text}
              backgroundColor="#fff"
            />
            <Text style={styles.qrLabel}>Scan to verify</Text>
          </View>
          <View style={styles.hashContainer}>
            <Text style={styles.hashLabel}>SHA-256 Hash</Text>
            <Text style={styles.hashValue} numberOfLines={2}>
              {data.sha256_hash.slice(0, 24)}...
            </Text>
            <Text style={[styles.hashLabel, { marginTop: 8 }]}>
              Verified {data.verified_count ?? 0}× by lenders
            </Text>
            <TouchableOpacity
              style={styles.verifyLinkBtn}
              onPress={() => openVerifyUrl(data.qr_data || `gigpay://verify/${data.human_id}`)}
            >
              <Text style={styles.verifyLink}>Open verify page →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Share buttons */}
      <TouchableOpacity
        style={[styles.shareBtn, sharing && styles.shareBtnDisabled]}
        onPress={handleShare}
        disabled={sharing}
      >
        {sharing
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.shareBtnText}>📤  Share PDF (WhatsApp / Email)</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkBtn} onPress={handleShareLink}>
        <Text style={styles.linkBtnText}>🔗  Share Verify Link</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backLink} onPress={() => router.push('/(tabs)/home' as any)}>
        <Text style={styles.backLinkText}>← Back to Home</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

/** Small helper component for detail rows */
function DetailRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.detailRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.background },
  content:          { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  center:           { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  loadingText:      { marginTop: spacing.md, color: colors.textMuted },
  errorText:        { color: colors.danger, textAlign: 'center', marginBottom: spacing.md, fontSize: 15 },
  headerBar:        { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  headerTitle:      { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  headerSub:        { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  certId:           { fontSize: 11, color: '#fff', fontFamily: 'monospace', fontWeight: '700' },
  card:             { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  cardTitle:        { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8, marginBottom: spacing.sm },
  detailRow:        { flexDirection: 'row', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel:      { flex: 1, fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  detailValue:      { flex: 2, fontSize: 13, color: colors.text },
  verdictBanner:    { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 2, marginBottom: spacing.md, backgroundColor: colors.card },
  verdictEmoji:     { fontSize: 36 },
  verdictLabel:     { fontSize: 17, fontWeight: '800' },
  verdictSub:       { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  metricsRow:       { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  metricCard:       { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  metricValue:      { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 4 },
  metricLabel:      { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  tamperRow:        { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  qrContainer:      { alignItems: 'center', backgroundColor: '#fff', padding: 8, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  qrLabel:          { fontSize: 10, color: colors.textMuted, marginTop: 6 },
  hashContainer:    { flex: 1, gap: 6 },
  hashLabel:        { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  hashValue:        { fontSize: 10, color: colors.text, fontFamily: 'monospace', lineHeight: 15 },
  verifyLinkBtn:    { marginTop: 4 },
  verifyLink:       { fontSize: 12, color: colors.primary, fontWeight: '600' },
  shareBtn:         { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 16, alignItems: 'center', marginBottom: spacing.sm },
  shareBtnDisabled: { opacity: 0.6 },
  shareBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  linkBtn:          { backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  linkBtnText:      { color: colors.primary, fontSize: 15, fontWeight: '600' },
  backBtn:          { backgroundColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, marginTop: spacing.md },
  backBtnText:      { color: colors.text, fontWeight: '600' },
  backLink:         { padding: spacing.md, alignItems: 'center' },
  backLinkText:     { color: colors.textMuted, fontSize: 14 },
});
