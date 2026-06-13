import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, radius } from '../constants/theme';
import { Certificate } from '../lib/types';
import { formatRupees } from '../lib/intelligence';

interface CertificateCardProps {
  certificate: Certificate;
  avgMonthly?: number;
  platform?: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  swiggy: '#FF6900',
  zomato: '#E23744',
  rapido: '#F7C948',
  other:  colors.textMuted,
};

/**
 * Summary card for a certificate — shown on the Certificates tab list.
 */
export function CertificateCard({ certificate, avgMonthly, platform }: CertificateCardProps) {
  const router = useRouter();
  const platformColor = PLATFORM_COLORS[platform ?? 'other'];

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/certificate/[id]', params: { id: certificate.human_id } })}
      activeOpacity={0.8}
    >
      {/* Top row */}
      <View style={styles.topRow}>
        <View style={[styles.platformDot, { backgroundColor: platformColor }]} />
        <Text style={styles.humanId}>{certificate.human_id}</Text>
        <View style={styles.verifiedBadge}>
          <Text style={styles.verifiedText}>✓ Verified</Text>
        </View>
      </View>

      {/* Stats */}
      {avgMonthly !== undefined && (
        <Text style={styles.income}>Avg: {formatRupees(avgMonthly)}/month</Text>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.date}>
          {new Date(certificate.issued_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </Text>
        <Text style={styles.views}>{certificate.verified_count} views</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card:          { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  topRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.sm },
  platformDot:   { width: 10, height: 10, borderRadius: 5 },
  humanId:       { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text, fontFamily: 'monospace' },
  verifiedBadge: { backgroundColor: '#DCFCE7', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  verifiedText:  { fontSize: 11, fontWeight: '700', color: colors.success },
  income:        { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  footer:        { flexDirection: 'row', justifyContent: 'space-between' },
  date:          { fontSize: 12, color: colors.textMuted },
  views:         { fontSize: 12, color: colors.textMuted },
});
