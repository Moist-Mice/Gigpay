import { View, Text, StyleSheet } from 'react-native';
import { radius } from '../constants/theme';

type Platform = 'swiggy' | 'zomato' | 'rapido' | 'other';

interface PlatformBadgeProps {
  platform: Platform | string;
  size?: 'sm' | 'md';
}

const PLATFORM_CONFIG: Record<string, {
  label: string;
  emoji: string;
  bg: string;
  border: string;
  text: string;
}> = {
  swiggy: { label: 'Swiggy', emoji: '🟠', bg: '#FFF1E6', border: '#FFB347', text: '#C45100' },
  zomato: { label: 'Zomato', emoji: '🔴', bg: '#FFF0F0', border: '#FCA5A5', text: '#B91C1C' },
  rapido: { label: 'Rapido', emoji: '🟡', bg: '#FFFBEB', border: '#FCD34D', text: '#92400E' },
  other:  { label: 'Other',  emoji: '➕', bg: '#F3F4F6', border: '#D1D5DB', text: '#6B7280' },
};

/**
 * Pill badge showing the gig platform (Swiggy, Zomato, Rapido) with brand colors.
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
      <Text style={isSm ? styles.emojiSm : styles.emoji}>{cfg.emoji}</Text>
      <Text style={[styles.label, { color: cfg.text }, isSm && styles.labelSm]}>
        {cfg.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge:    { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 6, gap: 6, alignSelf: 'flex-start' },
  badgeSm:  { paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
  emoji:    { fontSize: 16 },
  emojiSm:  { fontSize: 12 },
  label:    { fontSize: 14, fontWeight: '700' },
  labelSm:  { fontSize: 11, fontWeight: '700' },
});
