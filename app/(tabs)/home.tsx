import { useUser, useAuth } from '../../lib/auth';
import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors, spacing, radius } from '../../constants/theme';
import { copy } from '../../constants/copy';
import type { User, IncomeSubmission } from '../../lib/types';
import { EarningsCard } from '../../components/EarningsCard';

export default function HomeScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<User | null>(null);
  const [submissions, setSubmissions] = useState<IncomeSubmission[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    if (!user?.id) return;

    // Load user profile
    const { data: profileData } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_user_id', user.id)
      .maybeSingle();
    setProfile(profileData);

    if (!profileData) return;

    // Load past submissions
    const { data: subData } = await supabase
      .from('income_submissions')
      .select('*')
      .eq('user_id', profileData.id)
      .eq('status', 'complete')
      .order('created_at', { ascending: false })
      .limit(10);
    setSubmissions(subData ?? []);
  }

  useEffect(() => { loadData(); }, [user?.id]);

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const displayName = profile?.name ?? user?.firstName ?? 'there';
  const platformEmoji = {
    swiggy: '🟠', zomato: '🔴', rapido: '🟡', other: '➕',
  }[profile?.platform ?? 'other'] ?? '👤';

  // Compute stats from submissions
  const certCount = submissions.length;
  const avgIncome = submissions.length > 0
    ? Math.round(submissions.reduce((s, sub) => s + (sub.avg_monthly_income ?? 0), 0) / submissions.length)
    : null;
  const bestScore = submissions.length > 0
    ? Math.max(...submissions.map(s => s.consistency_score ?? 0))
    : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header bar */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>Namaste, {displayName} {platformEmoji}</Text>
          <Text style={styles.subtitle}>{copy.taglineEn}</Text>
        </View>
        <TouchableOpacity style={styles.avatarBtn} onPress={() => signOut()}>
          <Text style={styles.avatarText}>{displayName[0]?.toUpperCase() ?? '?'}</Text>
        </TouchableOpacity>
      </View>

      {/* Live stats strip */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{certCount}</Text>
          <Text style={styles.statLabel}>Submissions</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {avgIncome ? `₹${(avgIncome / 1000).toFixed(1)}k` : '—'}
          </Text>
          <Text style={styles.statLabel}>Avg Income</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, bestScore !== null && bestScore >= 80 && { color: colors.success }]}>
            {bestScore !== null ? `${bestScore}%` : '—'}
          </Text>
          <Text style={styles.statLabel}>Best Score</Text>
        </View>
      </View>

      {/* Submissions list or empty state */}
      {submissions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>📄</Text>
          <Text style={styles.emptyTitle}>{copy.emptyStateEn}</Text>
          <Text style={styles.emptyBody}>{copy.emptyStateBody}</Text>
        </View>
      ) : (
        <View style={styles.submissionsSection}>
          <Text style={styles.sectionTitle}>Past Submissions</Text>
          {submissions.map(sub => (
            <EarningsCard
              key={sub.id}
              submission={sub}
              onPress={() => router.push(`/results/${sub.id}` as any)}
            />
          ))}
        </View>
      )}

      {/* Primary CTA */}
      <TouchableOpacity
        style={styles.cta}
        onPress={() => router.push('/(tabs)/upload')}
        activeOpacity={0.85}
      >
        <Text style={styles.ctaIcon}>📷</Text>
        <Text style={styles.ctaText}>{copy.addEarnings}</Text>
      </TouchableOpacity>

      {/* How it works */}
      <View style={styles.howCard}>
        <Text style={styles.howTitle}>Kaise kaam karta hai?</Text>
        {[
          { icon: '📱', step: '01', text: 'Swiggy/Zomato earnings screen ki photo lo' },
          { icon: '🤖', step: '02', text: 'MiniMax AI income analyse karta hai' },
          { icon: '📄', step: '03', text: 'Certificate banao — SHA-256 tamper-proof' },
          { icon: '💬', step: '04', text: 'WhatsApp se lender ko bhejo' },
        ].map((item) => (
          <View key={item.step} style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumText}>{item.step}</Text>
            </View>
            <Text style={styles.stepIcon}>{item.icon}</Text>
            <Text style={styles.stepText}>{item.text}</Text>
          </View>
        ))}
      </View>

      {/* Trust strip */}
      <View style={styles.trustStrip}>
        <Text style={styles.trustText}>🔒 SHA-256 Tamper Proof  •  🇮🇳 India Ready  •  ✅ NBFC Accepted</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: colors.background },
  content:            { padding: spacing.md, paddingBottom: spacing.xl },
  headerRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md, marginBottom: spacing.lg },
  greeting:           { fontSize: 22, fontWeight: '800', color: colors.text },
  subtitle:           { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  avatarBtn:          { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText:         { color: '#fff', fontWeight: '800', fontSize: 18 },
  statsRow:           { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statCard:           { flex: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statValue:          { fontSize: 20, fontWeight: '800', color: colors.text },
  statLabel:          { fontSize: 11, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
  emptyCard:          { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  emptyEmoji:         { fontSize: 52, marginBottom: spacing.sm },
  emptyTitle:         { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 6 },
  emptyBody:          { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  submissionsSection: { marginBottom: spacing.lg },
  sectionTitle:       { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  cta:                { backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.lg, shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  ctaIcon:            { fontSize: 22 },
  ctaText:            { color: '#fff', fontSize: 17, fontWeight: '800' },
  howCard:            { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  howTitle:           { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  step:               { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.sm },
  stepNumber:         { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center' },
  stepNumText:        { fontSize: 11, fontWeight: '800', color: colors.primary },
  stepIcon:           { fontSize: 20 },
  stepText:           { fontSize: 14, color: colors.textMuted, flex: 1, lineHeight: 20 },
  trustStrip:         { backgroundColor: '#F0FDF4', borderRadius: radius.md, padding: spacing.sm, borderWidth: 1, borderColor: '#DCFCE7' },
  trustText:          { fontSize: 12, color: '#16A34A', textAlign: 'center', fontWeight: '600' },
});
