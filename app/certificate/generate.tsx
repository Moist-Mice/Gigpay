// app/certificate/generate.tsx
// Triggered from results screen: calls generate-certificate Edge Function,
// then navigates to /certificate/[id] to show the full certificate viewer.

import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { colors, spacing, radius } from '../../constants/theme';

const SUPABASE_URL     = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

type Stage = 'generating' | 'done' | 'error';

export default function GenerateCertificateScreen() {
  const { submissionId } = useLocalSearchParams<{ submissionId: string }>();
  const router = useRouter();
  const { getToken } = useAuth();
  const [stage, setStage] = useState<Stage>('generating');
  const [error, setError] = useState('');

  useEffect(() => {
    if (submissionId) generate();
  }, [submissionId]);

  async function generate() {
    setStage('generating');
    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication error. Please sign in again.');

      const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-certificate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ submission_id: submissionId }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? `Certificate generation failed (${response.status})`);
      }

      const data = await response.json();
      setStage('done');

      // Auto-navigate to certificate viewer after a brief moment
      setTimeout(() => {
        router.replace(`/certificate/${data.certificate_id}` as any);
      }, 800);

    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
      setStage('error');
    }
  }

  return (
    <View style={styles.container}>
      {stage === 'generating' && (
        <>
          <View style={styles.iconWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
          <Text style={styles.title}>Creating your certificate...</Text>
          <Text style={styles.subtitle}>Building your tamper-proof income PDF</Text>
          <View style={styles.steps}>
            <Text style={styles.step}>🔐  Verifying your data</Text>
            <Text style={styles.step}>📊  Computing income analysis</Text>
            <Text style={styles.step}>📄  Generating PDF with SHA-256 hash</Text>
          </View>
        </>
      )}
      {stage === 'done' && (
        <>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.title}>Certificate Ready!</Text>
          <Text style={styles.subtitle}>Redirecting you now...</Text>
        </>
      )}
      {stage === 'error' && (
        <>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.title}>Generation Failed</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={generate}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
            <Text style={styles.backLinkText}>← Go Back</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  iconWrap:    { width: 80, height: 80, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF7ED', borderRadius: 40, marginBottom: spacing.md },
  title:       { fontSize: 22, fontWeight: 'bold', color: colors.text, marginTop: spacing.md, textAlign: 'center' },
  subtitle:    { fontSize: 14, color: colors.textMuted, marginTop: 8, textAlign: 'center' },
  steps:       { marginTop: spacing.xl, gap: spacing.sm, alignSelf: 'stretch', backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  step:        { fontSize: 14, color: colors.textMuted, paddingVertical: 4 },
  successIcon: { fontSize: 64 },
  errorIcon:   { fontSize: 64 },
  errorText:   { fontSize: 14, color: colors.danger, textAlign: 'center', marginTop: 8, marginBottom: spacing.md },
  retryBtn:    { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, marginBottom: spacing.sm },
  retryBtnText:{ color: '#fff', fontWeight: '700', fontSize: 16 },
  backLink:    { padding: spacing.md },
  backLinkText:{ color: colors.textMuted },
});
