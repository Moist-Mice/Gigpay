// app/(tabs)/upload.tsx
import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Image, ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth, useUser } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { uploadAndParse } from '../../lib/upload';
import { colors, spacing, radius } from '../../constants/theme';
import { copy } from '../../constants/copy';

// Demo data — loaded on long-press (bypass camera for hackathon demo)
const DEMO_MONTHS = [
  { period: '2025-01', amount: 16800, trips: 212 },
  { period: '2025-02', amount: 17200, trips: 218 },
  { period: '2025-03', amount: 18100, trips: 229 },
  { period: '2025-04', amount: 17900, trips: 226 },
  { period: '2025-05', amount: 19200, trips: 243 },
  { period: '2025-06', amount: 18400, trips: 233 },
];

type Stage = 'idle' | 'picked' | 'uploading' | 'parsing' | 'done' | 'error';

export default function UploadScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { user } = useUser();
  const [stage, setStage] = useState<Stage>('idle');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState('');
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Pick image from camera ────────────────────────────────────────────────
  async function handleCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'GigPay needs camera access to photograph your earnings screen.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setStage('picked');
    }
  }

  // ── Pick image from gallery ───────────────────────────────────────────────
  async function handleGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'GigPay needs gallery access to select your earnings screenshot.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setStage('picked');
    }
  }

  // ── Upload + parse ────────────────────────────────────────────────────────
  async function handleProcess() {
    if (!imageUri || !user) return;
    setStage('uploading');
    setError('');

    try {
      // Fetch user record from DB to get our internal user_id
      const { data: dbUser } = await supabase
        .from('users')
        .select('id, platform')
        .eq('clerk_user_id', user.id)
        .single();

      if (!dbUser) throw new Error('User profile not found. Please complete onboarding.');

      setStatusMsg(copy.processingSteps[0]); // "Reading your earnings..."
      setStage('uploading');

      const token = await getToken();
      if (!token) throw new Error('Authentication failed. Please sign in again.');

      setStatusMsg(copy.processingSteps[1]); // "AI is analysing the data..."
      setStage('parsing');

      const submission = await uploadAndParse(
        imageUri,
        token,
        dbUser.id,
        dbUser.platform,
      );

      setStatusMsg(copy.processingSteps[2]); // "Calculating your income score..."

      // Navigate to results screen
      const resultId = (submission as any).submission_id ?? (submission as any).id;
      router.push(`/results/${resultId}` as any);

    } catch (e: any) {
      setError(e.message ?? 'Something went wrong. Please try again.');
      setStage('error');
    }
  }

  // ── Demo mode (long-press CTA) — bypass camera ───────────────────────────
  async function handleDemoMode() {
    if (!user) return;
    setStage('parsing');
    setStatusMsg('Loading demo data...');
    try {
      const { data: dbUser } = await supabase
        .from('users')
        .select('id, platform')
        .eq('clerk_user_id', user.id)
        .single();

      if (!dbUser) throw new Error('User profile not found.');

      // Insert demo submission directly (no AI call needed)
      const avg = Math.round(DEMO_MONTHS.reduce((s, m) => s + m.amount, 0) / DEMO_MONTHS.length);
      const { data: submission } = await supabase
        .from('income_submissions')
        .insert({
          user_id: dbUser.id,
          platform: 'swiggy',
          screenshot_url: 'demo://mock',
          months_data: DEMO_MONTHS,
          avg_monthly_income: avg,
          trend_pct: 2.3,
          consistency_score: 100,
          seasonality_flags: [],
          nbfc_verdict: 'STRONG',
          status: 'complete',
        })
        .select()
        .single();

      if (submission) {
        router.push(`/results/${submission.id}` as any);
      }
    } catch (e: any) {
      setError(e.message);
      setStage('error');
    }
  }

  const isProcessing = stage === 'uploading' || stage === 'parsing';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Kamai Add Karein</Text>
      <Text style={styles.subtitle}>Swiggy, Zomato, ya Rapido ki earnings screen ki photo khichein</Text>

      {/* Image preview */}
      {imageUri && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
          <TouchableOpacity style={styles.changeBtn} onPress={() => { setImageUri(null); setStage('idle'); }}>
            <Text style={styles.changeBtnText}>Change Photo</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Idle state — pick source */}
      {stage === 'idle' && (
        <View style={styles.pickerRow}>
          <TouchableOpacity style={styles.pickerCard} onPress={handleCamera}>
            <Text style={styles.pickerIcon}>📷</Text>
            <Text style={styles.pickerLabel}>Take Photo</Text>
            <Text style={styles.pickerSub}>Camera se photo lo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pickerCard} onPress={handleGallery}>
            <Text style={styles.pickerIcon}>🖼️</Text>
            <Text style={styles.pickerLabel}>Gallery</Text>
            <Text style={styles.pickerSub}>Screenshot select karo</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Processing state */}
      {isProcessing && (
        <View style={styles.processingBox}>
          <View style={styles.aiOrb}>
            <Text style={styles.aiOrbText}>🤖</Text>
          </View>
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.md }} />
          <Text style={styles.processingText}>{statusMsg}</Text>
          <Text style={styles.processingHint}>MiniMax M3 AI analyse kar raha hai • 5–10 seconds</Text>
        </View>
      )}

      {/* Error state */}
      {stage === 'error' && (
        <View style={styles.errorBox}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setStage('idle'); setImageUri(null); setError(''); }}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Confirm + process CTA */}
      {stage === 'picked' && imageUri && (
        <TouchableOpacity
          style={styles.cta}
          onPress={handleProcess}
          onLongPress={handleDemoMode}
          delayLongPress={1500}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>{copy.addEarnings}</Text>
        </TouchableOpacity>
      )}

      {/* Demo shortcut for idle state (long-press) */}
      {stage === 'idle' && (
        <TouchableOpacity
          style={styles.demoBtn}
          onLongPress={handleDemoMode}
          delayLongPress={1500}
        >
          <Text style={styles.demoBtnText}>Long-press to load demo data (Raju Kumar / Swiggy)</Text>
        </TouchableOpacity>
      )}

      {/* Tips */}
      {(stage === 'idle' || stage === 'picked') && (
        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>📋 Best results ke liye</Text>
          <Text style={styles.tipItem}>• Sabhi mahine screen pe visible honay chahiye</Text>
          <Text style={styles.tipItem}>• Phone seedha pakdein — blur se bachein</Text>
          <Text style={styles.tipItem}>• Earnings amounts clearly readable hon</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: colors.background },
  content:          { padding: spacing.md, paddingBottom: spacing.xl },
  title:            { fontSize: 24, fontWeight: 'bold', color: colors.text, marginTop: spacing.sm },
  subtitle:         { fontSize: 14, color: colors.textMuted, marginBottom: spacing.lg, marginTop: 4, lineHeight: 20 },
  pickerRow:        { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  pickerCard:       { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  pickerIcon:       { fontSize: 36, marginBottom: spacing.sm },
  pickerLabel:      { fontSize: 14, fontWeight: '700', color: colors.text, textAlign: 'center' },
  pickerSub:        { fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 2 },
  previewContainer: { borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  preview:          { width: '100%', height: 280, backgroundColor: colors.border },
  changeBtn:        { padding: spacing.sm, alignItems: 'center', backgroundColor: colors.card },
  changeBtnText:    { color: colors.primary, fontWeight: '600' },
  cta:              { backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 18, alignItems: 'center', marginBottom: spacing.md, shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  ctaText:          { color: '#fff', fontSize: 17, fontWeight: '700' },
  demoBtn:          { padding: spacing.md, alignItems: 'center' },
  demoBtnText:      { color: colors.textMuted, fontSize: 12 },
  processingBox:    { alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
  aiOrb:            { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.primary + '40' },
  aiOrbText:        { fontSize: 36 },
  processingText:   { fontSize: 16, fontWeight: '600', color: colors.text, textAlign: 'center', marginTop: spacing.sm },
  processingHint:   { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  errorBox:         { alignItems: 'center', padding: spacing.lg, backgroundColor: '#FEF2F2', borderRadius: radius.lg, borderWidth: 1, borderColor: '#FECACA' },
  errorIcon:        { fontSize: 32, marginBottom: spacing.sm },
  errorText:        { fontSize: 14, color: colors.danger, textAlign: 'center', marginBottom: spacing.md },
  retryBtn:         { backgroundColor: colors.danger, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  retryBtnText:     { color: '#fff', fontWeight: '700' },
  tips:             { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginTop: spacing.md },
  tipsTitle:        { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  tipItem:          { fontSize: 13, color: colors.textMuted, marginBottom: 4, lineHeight: 18 },
});
