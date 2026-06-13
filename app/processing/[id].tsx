// app/processing/[id].tsx
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors, spacing } from '../../constants/theme';
import { copy } from '../../constants/copy';

export default function ProcessingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [dotCount, setDotCount] = useState(1);

  // Cycle through processing step labels
  useEffect(() => {
    const labelTimer = setInterval(() => {
      setStepIndex(i => (i + 1) % copy.processingSteps.length);
    }, 2500);
    const dotTimer = setInterval(() => {
      setDotCount(d => (d % 3) + 1);
    }, 500);
    return () => { clearInterval(labelTimer); clearInterval(dotTimer); };
  }, []);

  // Poll submission status every 2 seconds
  useEffect(() => {
    if (!id) return;
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from('income_submissions')
        .select('status, id')
        .eq('id', id)
        .single();

      if (data?.status === 'complete') {
        clearInterval(poll);
        router.replace(`/results/${id}` as any);
      } else if (data?.status === 'failed') {
        clearInterval(poll);
        router.replace('/(tabs)/upload' as any);
      }
    }, 2000);

    return () => clearInterval(poll);
  }, [id]);

  return (
    <View style={styles.container}>
      <View style={styles.orb}>
        <Text style={styles.emoji}>🤖</Text>
      </View>
      <Text style={styles.label}>
        {copy.processingSteps[stepIndex]}{''.padEnd(dotCount, '.')}
      </Text>
      <Text style={styles.hint}>MiniMax M3 AI aapki earnings padh raha hai</Text>

      {/* Animated dots */}
      <View style={styles.dotsRow}>
        {[0, 1, 2].map(i => (
          <View
            key={i}
            style={[styles.dot, i < dotCount && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  orb: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary + '18',
    borderWidth: 2,
    borderColor: colors.primary + '40',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emoji:   { fontSize: 56 },
  label:   { fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
  hint:    { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.lg },
  dotsRow: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  dot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary },
});
