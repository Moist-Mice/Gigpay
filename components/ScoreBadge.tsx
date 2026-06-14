import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../constants/theme';

type Verdict = 'STRONG' | 'MODERATE' | 'WEAK';

interface ScoreBadgeProps {
  verdict: Verdict;
  score?: number;  // 0–100 consistency score
  size?: 'sm' | 'md' | 'lg';
}

const VERDICT_CONFIG: Record<Verdict, {
  label: string;
  sublabel: string;
  bg: string;
  border: string;
  color: string;
}> = {
  STRONG: {
    label:    'STRONG',
    sublabel: 'Excellent profile consistency',
    bg:       'rgba(16, 185, 129, 0.12)',
    border:   'rgba(16, 185, 129, 0.35)',
    color:    '#34D399',
  },
  MODERATE: {
    label:    'MODERATE',
    sublabel: 'Stable, room to grow',
    bg:       'rgba(245, 158, 11, 0.12)',
    border:   'rgba(245, 158, 11, 0.35)',
    color:    '#FBBF24',
  },
  WEAK: {
    label:    'WEAK',
    sublabel: 'Action needed to improve consistency',
    bg:       'rgba(239, 68, 68, 0.12)',
    border:   'rgba(239, 68, 68, 0.35)',
    color:    '#FCA5A5',
  },
};

/**
 * Displays NBFC verdict badge with colour-coded background and label.
 */
export function ScoreBadge({ verdict, score, size = 'md' }: ScoreBadgeProps) {
  const cfg = VERDICT_CONFIG[verdict];
  const isLg = size === 'lg';
  const isSm = size === 'sm';

  return (
    <View style={[
      styles.badge,
      { backgroundColor: cfg.bg, borderColor: cfg.border },
      isLg && styles.badgeLg,
      isSm && styles.badgeSm,
    ]}>
      <View style={[styles.dot, { backgroundColor: cfg.color }, isSm && styles.dotSm]} />
      <View>
        <Text style={[styles.label, { color: cfg.color }, isLg && styles.labelLg, isSm && styles.labelSm]}>
          {cfg.label}
          {score !== undefined ? ` · ${score}/100` : ''}
        </Text>
        {!isSm && (
          <Text style={[styles.sublabel, { color: '#9CA3AF' }]}>{cfg.sublabel}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge:      { flexDirection: 'row', alignItems: 'center', borderRadius: radius.md, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, gap: 8, alignSelf: 'flex-start' },
  badgeLg:    { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14 },
  badgeSm:    { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 5 },
  dot:        { width: 8, height: 8, borderRadius: 4 },
  dotSm:      { width: 6, height: 6, borderRadius: 3 },
  label:      { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  labelLg:    { fontSize: 16 },
  labelSm:    { fontSize: 10 },
  sublabel:   { fontSize: 10, fontWeight: '500', marginTop: 2, letterSpacing: 0.2 },
});

