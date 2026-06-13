import { useUser, useAuth } from '../../lib/clerk';
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
import {
  FileTextIcon,
  RobotIcon,
  TrendingUpIcon,
  SparklesIcon,
  PlusIcon,
  ShieldCheckIcon,
} from '../../components/Icons';

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

  // Compute stats from submissions
  const certCount = submissions.length;
  const avgIncome = submissions.length > 0
    ? Math.round(submissions.reduce((s, sub) => s + (sub.avg_monthly_income ?? 0), 0) / submissions.length)
    : null;
  // Phase 4: prefer composite credit score, fall back to consistency score
  const bestScore = submissions.length > 0
    ? Math.max(...submissions.map(s => (s as any).composite_credit_score ?? s.consistency_score ?? 0))
    : null;
  const isPhase4 = submissions.some(s => (s as any).composite_credit_score != null);

  const steps = [
    { Step: '01', Icon: FileTextIcon, Text: 'Bank ya CC statement PDF upload karein (net banking se download karein)' },
    { Step: '02', Icon: RobotIcon, Text: 'AI bank data extract karta hai — 6 months credits, debits, EMIs' },
    { Step: '03', Icon: TrendingUpIcon, Text: '8 signals se credit score (0-100) calculate hota hai' },
    { Step: '04', Icon: SparklesIcon, Text: 'Certificate banao aur lender ko WhatsApp pe bhejo' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header bar */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.greeting}>Namaste, {displayName}</Text>
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
          <Text style={[styles.statValue, bestScore !== null && bestScore >= 75 && { color: colors.success }]}>
            {bestScore !== null ? (isPhase4 ? `${bestScore}/100` : `${bestScore}%`) : '—'}
          </Text>
          <Text style={styles.statLabel}>{isPhase4 ? 'Credit Score' : 'Best Score'}</Text>
        </View>
      </View>

      {/* Submissions list or empty state */}
      {submissions.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={{ marginBottom: spacing.md }}>
            <FileTextIcon size={48} color={colors.textMuted} strokeWidth={1.5} />
          </View>
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
        <PlusIcon size={20} color="#fff" strokeWidth={2.5} />
        <Text style={styles.ctaText}>Statement Upload Karein</Text>
      </TouchableOpacity>

      {/* How it works */}
      <View style={styles.howCard}>
        <Text style={styles.howTitle}>Kaise kaam karta hai?</Text>
        {steps.map((item) => {
          const IconComp = item.Icon;
          return (
            <View key={item.Step} style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumText}>{item.Step}</Text>
              </View>
              <View style={styles.stepIconContainer}>
                <IconComp size={18} color={colors.primary} strokeWidth={2} />
              </View>
              <Text style={styles.stepText}>{item.Text}</Text>
            </View>
          );
        })}
      </View>

      {/* Trust strip */}
      <View style={styles.trustStrip}>
        <ShieldCheckIcon size={14} color="#10B981" strokeWidth={2.5} />
        <Text style={styles.trustText}>Tamper Proof  •  8-Signal Credit Score  •  NBFC Accepted</Text>
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
  stepIconContainer:  { width: 24, alignItems: 'center' },
  stepText:           { fontSize: 13, color: colors.textMuted, flex: 1, lineHeight: 18 },
  trustStrip:         { backgroundColor: '#0B251B', borderRadius: radius.md, padding: spacing.sm, borderWidth: 1, borderColor: '#10B98135', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  trustText:          { fontSize: 12, color: '#10B981', fontWeight: '600' },
});
