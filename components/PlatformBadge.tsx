import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../constants/theme';

type Platform = 'swiggy' | 'zomato' | 'rapido' | 'other';

interface PlatformBadgeProps {
  platform: Platform | string;
  size?: 'sm' | 'md';
}

const PLATFORM_CONFIG: Record<string, {
  label: string;
  color: string;
  bg: string;
  border: string;
}> = {
  swiggy: { label: 'Swiggy', color: '#FF7A00', bg: 'rgba(255, 122, 0, 0.15)', border: 'rgba(255, 122, 0, 0.35)' },
  zomato: { label: 'Zomato', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.35)' },
  rapido: { label: 'Rapido', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)' },
  other:  { label: 'Other Platform',  color: '#9CA3AF', bg: 'rgba(156, 163, 175, 0.12)', border: 'rgba(156, 163, 175, 0.3)' },
};

/**
 * Pill badge showing the gig platform (Swiggy, Zomato, Rapido) with premium brand colors.
 */
export function PlatformBadge({ platform, size = 'md' }: PlatformBadgeProps) {
  const cfg = PLATFORM_CONFIG[platform] ?? PLATFORM_CONFIG['other'];
  const isSm = size === 'sm';

  return (
    <View style={[
      styles.badge,
      { backgroundColor: cfg.bg, borderColor: cfg.border },
      isSm && styles.badgeSm,
    ]}>
      <View style={[styles.dot, { backgroundColor: cfg.color }, isSm && styles.dotSm]} />
      <Text style={[styles.label, { color: '#F3F4F6' }, isSm && styles.labelSm]}>
        {cfg.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge:    { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5, gap: 8, alignSelf: 'flex-start' },
  badgeSm:  { paddingHorizontal: 8, paddingVertical: 3, gap: 5 },
  dot:      { width: 8, height: 8, borderRadius: 4, shadowColor: '#fff', shadowOpacity: 0.1, shadowRadius: 2 },
  dotSm:    { width: 6, height: 6, borderRadius: 3 },
  label:    { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  labelSm:  { fontSize: 10, fontWeight: '700' },
});

