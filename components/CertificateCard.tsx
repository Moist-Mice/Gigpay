import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, radius } from '../constants/theme';
import { Certificate } from '../lib/types';
import { formatRupees } from '../lib/intelligence';
import { ShieldCheckIcon } from './Icons';

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
      activeOpacity={0.85}
    >
      {/* Top row */}
      <View style={styles.topRow}>
        <View style={[styles.platformDot, { backgroundColor: platformColor }]} />
        <Text style={styles.humanId}>{certificate.human_id}</Text>
        <View style={styles.verifiedBadge}>
          <ShieldCheckIcon size={12} color={colors.success} strokeWidth={2.5} />
          <Text style={styles.verifiedText}>Verified</Text>
        </View>
      </View>

      {/* Stats */}
      {avgMonthly !== undefined && (
        <Text style={styles.income}>Avg: {formatRupees(avgMonthly)}<Text style={styles.perMonth}>/mo</Text></Text>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.date}>
          Issued {new Date(certificate.issued_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </Text>
        <Text style={styles.views}>{certificate.verified_count} scans</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card:          { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  topRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.sm },
  platformDot:   { width: 8, height: 8, borderRadius: 4 },
  humanId:       { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text, fontFamily: 'monospace', letterSpacing: 0.5 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.12)', borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
  verifiedText:  { fontSize: 10, fontWeight: '800', color: colors.success, letterSpacing: 0.3, textTransform: 'uppercase' },
  income:        { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: spacing.sm, letterSpacing: -0.2 },
  perMonth:      { fontSize: 14, color: colors.textMuted, fontWeight: '400' },
  footer:        { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border + '50', paddingTop: spacing.sm },
  date:          { fontSize: 11, color: colors.textMuted },
  views:         { fontSize: 11, color: colors.textMuted },
});

