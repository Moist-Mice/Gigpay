// app/(tabs)/certificates.tsx
// Real certificates list for the signed-in user.

import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors, spacing, radius } from '../../constants/theme';
import type { Certificate } from '../../lib/types';

export default function CertificatesScreen() {
  const router = useRouter();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadCertificates(); }, []);

  async function loadCertificates() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('certificates')
        .select('*')
        .order('issued_at', { ascending: false });
      setCerts((data ?? []) as Certificate[]);
    } finally {
      setLoading(false);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCertificates();
    setRefreshing(false);
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (certs.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>📄</Text>
        <Text style={styles.emptyTitle}>No certificates yet</Text>
        <Text style={styles.emptySub}>
          Upload earnings screenshots and generate your first tamper-proof certificate
        </Text>
        <TouchableOpacity
          style={styles.cta}
          onPress={() => router.push('/(tabs)/upload' as any)}
        >
          <Text style={styles.ctaText}>Kamai Jodein →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mere Certificates</Text>
      <Text style={styles.subtitle}>{certs.length} certificate{certs.length !== 1 ? 's' : ''} issued</Text>
      <FlatList
        data={certs}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.certCard}
            onPress={() => router.push(`/certificate/${item.id}` as any)}
            activeOpacity={0.75}
          >
            {/* Left: certificate badge */}
            <View style={styles.certBadge}>
              <Text style={styles.certBadgeIcon}>📋</Text>
            </View>

            {/* Middle: ID + date */}
            <View style={styles.certCardMid}>
              <Text style={styles.certId}>{item.human_id}</Text>
              <Text style={styles.certDate}>
                {new Date(item.issued_at).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </Text>
            </View>

            {/* Right: verified count + arrow */}
            <View style={styles.certCardRight}>
              <View style={styles.verifiedPill}>
                <Text style={styles.verifiedCount}>
                  ✓ {item.verified_count ?? 0}×
                </Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </View>
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <Text style={styles.footer}>
            All certificates are tamper-proof via SHA-256 hash
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.background },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  title:          { fontSize: 26, fontWeight: 'bold', color: colors.text, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  subtitle:       { fontSize: 13, color: colors.textMuted, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  list:           { padding: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  emptyIcon:      { fontSize: 72, marginBottom: spacing.md },
  emptyTitle:     { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 8 },
  emptySub:       { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: spacing.lg, maxWidth: 280 },
  cta:            { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: 14 },
  ctaText:        { color: '#fff', fontWeight: '700', fontSize: 16 },
  certCard:       { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border },
  certBadge:      { width: 44, height: 44, backgroundColor: '#FFF7ED', borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  certBadgeIcon:  { fontSize: 22 },
  certCardMid:    { flex: 1, gap: 3 },
  certId:         { fontSize: 15, fontWeight: '700', color: colors.text, fontFamily: 'monospace' },
  certDate:       { fontSize: 12, color: colors.textMuted },
  certCardRight:  { alignItems: 'flex-end', gap: 6 },
  verifiedPill:   { backgroundColor: '#F0FDF4', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  verifiedCount:  { fontSize: 12, color: colors.success, fontWeight: '700' },
  arrow:          { fontSize: 20, color: colors.textMuted },
  footer:         { fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: spacing.md, lineHeight: 18 },
});
