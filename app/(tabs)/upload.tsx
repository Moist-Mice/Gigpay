// app/(tabs)/upload.tsx — Phase 4: Bank Statement PDF upload
import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useAuth, useUser } from '../../lib/clerk';
import { supabase } from '../../lib/supabase';
import { pdfToBase64, checkPdfSize } from '../../lib/pdf-extract';
import { colors, spacing, radius } from '../../constants/theme';
import { copy } from '../../constants/copy';
import {
  BankIcon,
  CreditCardIcon,
  FileTextIcon,
  RobotIcon,
  TrendingUpIcon,
  DollarIcon,
  PercentIcon,
  CheckIcon,
  SparklesIcon,
  AlertTriangleIcon,
} from '../../components/Icons';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Mock bank data for demo mode (long-press)
const MOCK_MONTHS = [
  { month: '2025-01', total_credits: 34200, total_debits: 26800, emi_payments: 8500, upi_credits: 18, closing_balance: 12400, salary_credits: 0, gig_credits: 12 },
  { month: '2025-02', total_credits: 36800, total_debits: 27200, emi_payments: 8500, upi_credits: 22, closing_balance: 15600, salary_credits: 0, gig_credits: 15 },
  { month: '2025-03', total_credits: 38100, total_debits: 28900, emi_payments: 8500, upi_credits: 24, closing_balance: 17200, salary_credits: 0, gig_credits: 18 },
  { month: '2025-04', total_credits: 35600, total_debits: 27100, emi_payments: 8500, upi_credits: 20, closing_balance: 16100, salary_credits: 0, gig_credits: 14 },
  { month: '2025-05', total_credits: 41200, total_debits: 29800, emi_payments: 8500, upi_credits: 28, closing_balance: 19600, salary_credits: 0, gig_credits: 22 },
  { month: '2025-06', total_credits: 39400, total_debits: 28400, emi_payments: 8500, upi_credits: 25, closing_balance: 22100, salary_credits: 0, gig_credits: 20 },
];

type Stage = 'idle' | 'picked' | 'uploading' | 'parsing' | 'done' | 'error';
type StatementType = 'bank' | 'credit_card';

export default function UploadScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { user } = useUser();
  const [stage, setStage] = useState<Stage>('idle');
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [statementType, setStatementType] = useState<StatementType>('bank');
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState('');

  // ── Pick PDF ────────────────────────────────────────────────────────────────
  async function handlePickPDF() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      // Size check
      const sizeWarning = await checkPdfSize(asset.uri);
      if (sizeWarning) {
        Alert.alert('File too large', sizeWarning);
        return;
      }

      setPdfUri(asset.uri);
      setPdfName(asset.name);
      setStage('picked');
      setError('');
    } catch (e: any) {
      Alert.alert('Could not pick file', e.message ?? 'Try again');
    }
  }

  // ── Upload + Parse PDF ──────────────────────────────────────────────────────
  async function handleProcess() {
    if (!pdfUri || !user) return;
    setStage('uploading');
    setStatusMsg('Statement read ho raha hai...');
    setError('');

    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication failed. Please sign in again.');

      setStatusMsg('PDF base64 mein convert ho raha hai...');
      const pdf_base64 = await pdfToBase64(pdfUri);

      setStage('parsing');
      setStatusMsg('AI bank data extract kar raha hai...');

      const response = await fetch(`${SUPABASE_URL}/functions/v1/parse-statement`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ pdf_base64, statement_type: statementType }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? `Parse failed: ${response.status}`);
      }

      const data = await response.json();
      router.push(`/results/${data.submission_id}` as any);

    } catch (e: any) {
      setError(e.message ?? 'Something went wrong. Please try again.');
      setStage('error');
    }
  }

  // ── Demo Mode (long-press) ──────────────────────────────────────────────────
  async function handleDemoMode() {
    if (!user) return;
    setStage('parsing');
    setStatusMsg('Demo data load ho raha hai...');
    setError('');

    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication failed.');

      const response = await fetch(`${SUPABASE_URL}/functions/v1/parse-statement`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ use_mock: true, statement_type: 'bank' }),
      });

      if (!response.ok) {
        // Fallback: direct Supabase insert if edge function not deployed
        const { data: dbUser } = await supabase
          .from('users').select('id').eq('clerk_user_id', user.id).single();
        if (!dbUser) throw new Error('User profile not found.');

        const months_data = MOCK_MONTHS.map(m => ({ period: m.month, amount: m.total_credits }));
        const avgIncome = Math.round(MOCK_MONTHS.reduce((s, m) => s + m.total_credits, 0) / MOCK_MONTHS.length);

        const { data: sub } = await supabase.from('income_submissions').insert({
          user_id: dbUser.id, platform: 'other', screenshot_url: 'pdf://demo',
          months_data, avg_monthly_income: avgIncome, trend_pct: 3.2,
          consistency_score: 88, seasonality_flags: [], nbfc_verdict: 'STRONG',
          status: 'complete', statement_type: 'bank',
          income_stability_score: 85, debt_to_income_ratio: 0.25,
          savings_rate: 0.22, composite_credit_score: 74, loan_eligibility_estimate: 190000,
        }).select().single();

        if (sub) router.push(`/results/${sub.id}` as any);
        return;
      }

      const data = await response.json();
      router.push(`/results/${data.submission_id}` as any);

    } catch (e: any) {
      setError(e.message);
      setStage('error');
    }
  }

  const isProcessing = stage === 'uploading' || stage === 'parsing';

  const analysisSignals = [
    { Icon: TrendingUpIcon, label: 'Income Stability Score', color: colors.primary },
    { Icon: DollarIcon, label: 'Avg Monthly Credits', color: '#60A5FA' },
    { Icon: BankIcon, label: 'Debt-to-Income Ratio', color: '#F87171' },
    { Icon: PercentIcon, label: 'Savings Rate', color: '#34D399' },
    { Icon: CheckIcon, label: 'Payment Discipline', color: '#A78BFA' },
    { Icon: SparklesIcon, label: 'Composite Credit Score (0–100)', color: '#FBBF24' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Statement Upload Karein</Text>
      <Text style={styles.subtitle}>Apna bank ya credit card statement PDF upload karein — AI credit score calculate karega</Text>

      {/* Statement Type Selector */}
      {stage === 'idle' && (
        <View style={styles.typeRow}>
          {(['bank', 'credit_card'] as StatementType[]).map(t => {
            const isSelected = statementType === t;
            return (
              <TouchableOpacity
                key={t}
                style={[styles.typeCard, isSelected && styles.typeCardActive]}
                onPress={() => setStatementType(t)}
                activeOpacity={0.7}
              >
                <View style={styles.typeIconContainer}>
                  {t === 'bank' ? (
                    <BankIcon size={28} color={isSelected ? colors.primary : colors.textMuted} strokeWidth={2} />
                  ) : (
                    <CreditCardIcon size={28} color={isSelected ? colors.primary : colors.textMuted} strokeWidth={2} />
                  )}
                </View>
                <Text style={[styles.typeLabel, isSelected && styles.typeLabelActive]}>
                  {t === 'bank' ? 'Bank Statement' : 'Credit Card'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Idle — pick PDF */}
      {stage === 'idle' && (
        <TouchableOpacity
          style={styles.pickCard}
          onPress={handlePickPDF}
          onLongPress={handleDemoMode}
          delayLongPress={1500}
          activeOpacity={0.8}
        >
          <View style={styles.pickIconContainer}>
            <FileTextIcon size={44} color={colors.primary} strokeWidth={1.5} />
          </View>
          <Text style={styles.pickLabel}>PDF Select Karein</Text>
          <Text style={styles.pickSub}>Bank/CC statement · 6 months recommended</Text>
          <View style={styles.pickBadge}><Text style={styles.pickBadgeText}>TAP TO PICK</Text></View>
        </TouchableOpacity>
      )}

      {/* File picked preview */}
      {stage === 'picked' && pdfName && (
        <View style={styles.fileCard}>
          <FileTextIcon size={24} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.fileName} numberOfLines={1}>{pdfName}</Text>
            <Text style={styles.fileType}>
              {statementType === 'bank' ? 'Bank Statement' : 'Credit Card Statement'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => { setPdfUri(null); setPdfName(null); setStage('idle'); }}>
            <Text style={styles.fileChange}>Change</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Processing state */}
      {isProcessing && (
        <View style={styles.processingBox}>
          <View style={styles.aiOrb}>
            <RobotIcon size={36} color={colors.primary} strokeWidth={2} />
          </View>
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.md }} />
          <Text style={styles.processingText}>{statusMsg}</Text>
          <Text style={styles.processingHint}>Gemma AI 6 months ka data analyse kar raha hai...</Text>
        </View>
      )}

      {/* Error */}
      {stage === 'error' && (
        <View style={styles.errorBox}>
          <View style={{ marginBottom: spacing.sm }}>
            <AlertTriangleIcon size={32} color="#FCA5A5" strokeWidth={2} />
          </View>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setStage('idle'); setPdfUri(null); setError(''); }}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Confirm CTA */}
      {stage === 'picked' && pdfUri && (
        <TouchableOpacity
          style={styles.cta}
          onPress={handleProcess}
          onLongPress={handleDemoMode}
          delayLongPress={1500}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>Analyse Karein</Text>
        </TouchableOpacity>
      )}

      {/* Demo hint */}
      {stage === 'idle' && (
        <TouchableOpacity
          style={styles.demoBtn}
          onLongPress={handleDemoMode}
          delayLongPress={1500}
        >
          <Text style={styles.demoBtnText}>Long-press to load demo bank statement</Text>
        </TouchableOpacity>
      )}

      {/* Tips */}
      {(stage === 'idle' || stage === 'picked') && (
        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>Best results ke liye</Text>
          <Text style={styles.tipItem}>• 3–6 months ka statement use karein</Text>
          <Text style={styles.tipItem}>• Official bank PDF download karein (net banking se)</Text>
          <Text style={styles.tipItem}>• Password-protected PDF hata dein pehle</Text>
          <Text style={styles.tipItem}>• 5MB se bada file use na karein</Text>
        </View>
      )}

      {/* What signals */}
      {stage === 'idle' && (
        <View style={styles.signalCard}>
          <Text style={styles.signalTitle}>Kya analyse hoga?</Text>
          {analysisSignals.map(s => {
            const SigIcon = s.Icon;
            return (
              <View key={s.label} style={styles.signalRow}>
                <View style={styles.signalIcon}>
                  <SigIcon size={14} color={s.color} strokeWidth={2.5} />
                </View>
                <Text style={styles.signalLabel}>{s.label}</Text>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: colors.background },
  content:            { padding: spacing.md, paddingBottom: spacing.xl },
  title:              { fontSize: 24, fontWeight: 'bold', color: colors.text, marginTop: spacing.sm },
  subtitle:           { fontSize: 14, color: colors.textMuted, marginBottom: spacing.lg, marginTop: 4, lineHeight: 20 },
  typeRow:            { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  typeCard:           { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  typeCardActive:     { borderColor: colors.primary, backgroundColor: 'rgba(255, 122, 0, 0.12)' },
  typeIconContainer:  { marginBottom: 8 },
  typeLabel:          { fontSize: 13, fontWeight: '600', color: colors.textMuted, textAlign: 'center' },
  typeLabelActive:    { color: colors.primary, fontWeight: '800' },
  pickCard:           { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: colors.primary, borderStyle: 'dashed', marginBottom: spacing.lg },
  pickIconContainer:  { marginBottom: spacing.sm },
  pickLabel:          { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 },
  pickSub:            { fontSize: 13, color: colors.textMuted, marginBottom: spacing.md },
  pickBadge:          { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: spacing.md, paddingVertical: 6 },
  pickBadgeText:      { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  fileCard:           { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  fileName:           { fontSize: 14, fontWeight: '600', color: colors.text },
  fileType:           { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  fileChange:         { color: colors.primary, fontWeight: '700', fontSize: 13 },
  cta:                { backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 18, alignItems: 'center', marginBottom: spacing.md, shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  ctaText:            { color: '#fff', fontSize: 17, fontWeight: '800' },
  demoBtn:            { padding: spacing.md, alignItems: 'center' },
  demoBtnText:        { color: colors.textMuted, fontSize: 12 },
  processingBox:      { alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
  aiOrb:              { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255, 122, 0, 0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 122, 0, 0.35)' },
  processingText:     { fontSize: 16, fontWeight: '600', color: colors.text, textAlign: 'center', marginTop: spacing.sm },
  processingHint:     { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  errorBox:           { alignItems: 'center', padding: spacing.lg, backgroundColor: 'rgba(239, 68, 68, 0.12)', borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  errorText:          { fontSize: 14, color: '#FCA5A5', textAlign: 'center', marginBottom: spacing.md },
  retryBtn:           { backgroundColor: colors.danger, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  retryBtnText:       { color: '#fff', fontWeight: '700' },
  tips:               { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  tipsTitle:          { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  tipItem:            { fontSize: 13, color: colors.textMuted, marginBottom: 4, lineHeight: 18 },
  signalCard:         { backgroundColor: colors.surfaceOrange, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: 'rgba(255, 122, 0, 0.25)', marginTop: spacing.sm },
  signalTitle:        { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  signalRow:          { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 8 },
  signalIcon:         { width: 24, alignItems: 'center' },
  signalLabel:        { fontSize: 13, color: colors.textMuted },
});
